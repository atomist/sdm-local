/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { logger } from "@atomist/automation-client";
import { successOn } from "@atomist/automation-client/action/ActionResult";
import { RepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { ProjectPersister } from "@atomist/automation-client/operations/generate/generatorUtils";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { LocalProject } from "@atomist/automation-client/project/local/LocalProject";
import { NodeFsLocalProject } from "@atomist/automation-client/project/local/NodeFsLocalProject";
import { LocalModeConfiguration } from "@atomist/sdm-core";
import * as fs from "fs";
import { promisify } from "util";
import { AutomationClientFinder } from "../../../cli/invocation/http/AutomationClientFinder";
import { invokeEventHandlerUsingHttpOnAll } from "../../../cli/invocation/http/invokeEventHandlerUsingHttp";
import { addGitHooksToProject } from "../../../cli/setup/addGitHooks";
import { handlePushBasedEventOnRepo } from "../../../common/git/handlePushBasedEventOnRepo";
import { LocalTeamContext } from "../../../common/invocation/LocalTeamContext";
import { invokeEventHandlerInProcess } from "../../invocation/invokeEventHandlerInProcess";
import { lastSha } from "../../util/git";
import { runAndLog } from "../../util/runAndLog";
import { sendChannelLinkEvent, sendRepoCreationEvent, sendRepoOnboardingEvent } from "../event/repoOnboardingEvents";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

/**
 * Persist the project to the given local directory given expanded directory
 * conventions. Perform a git init and other after actions, such as installing
 * our git hooks. Fires off the necessary new repo events using HTTP to
 * all local automation clients.
 * @return {ProjectPersister}
 */
export function fileSystemProjectPersister(teamContext: LocalTeamContext,
                                           localModeCofiguration: LocalModeConfiguration,
                                           automationClientFinder: AutomationClientFinder): ProjectPersister {
    return async (p, _, id, params) => {
        const baseDir = `${localModeCofiguration.repositoryOwnerParentDirectory}/${id.owner}/${id.repo}`;
        const frr = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory: localModeCofiguration.repositoryOwnerParentDirectory,
            baseDir,
        });
        // Override target repo to get file url
        // TODO this is a bit nasty
        Object.defineProperty((params as any).target, "repoRef", {
            get() {
                return frr;
            },
        });
        logger.info("Persisting to [%s]", baseDir);
        if (await promisify(fs.exists)(baseDir)) {
            throw new Error(`Cannot write new project to [${baseDir}] as this directory already exists`);
        }
        const createdProject = await NodeFsLocalProject.copy(p, baseDir);
        await runAndLog("git init", { cwd: baseDir });
        await runAndLog("git add .", { cwd: baseDir });
        await runAndLog(`git commit -a -m "Initial commit from Atomist"`, { cwd: baseDir });
        await addGitHooksToProject(createdProject);

        await emitEventsForNewProject(teamContext, localModeCofiguration, createdProject, id, automationClientFinder);
        return successOn(createdProject);
    };
}

/**
 * Send events that should apply to a new project
 */
async function emitEventsForNewProject(cc: LocalTeamContext,
                                       lc: LocalModeConfiguration,
                                       createdProject: LocalProject,
                                       id: RepoRef,
                                       automationClientFinder: AutomationClientFinder) {
    const eventSender = await invokeEventHandlerUsingHttpOnAll(automationClientFinder, cc);
    await sendRepoCreationEvent(cc, id, eventSender);

    const sha = await lastSha(createdProject as GitProject);
    const branch = "master";

    await handlePushBasedEventOnRepo(cc.atomistTeamId, invokeEventHandlerInProcess(), lc, {
        baseDir: createdProject.baseDir,
        sha,
        branch,
    }, "OnFirstPushToRepo");

    // This is the first push
    await handlePushBasedEventOnRepo(cc.atomistTeamId, invokeEventHandlerInProcess(), lc, {
        baseDir: createdProject.baseDir,
        sha,
        branch,
    }, "SetGoalsOnPush");

    await sendRepoOnboardingEvent(cc, id, eventSender);
    await sendChannelLinkEvent(cc, id, eventSender);
}
