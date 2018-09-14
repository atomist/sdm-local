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

import {
    ProjectPersister,
    successOn,
} from "@atomist/automation-client";
import {
    GitProject,
    LocalProject,
    LocalSoftwareDeliveryMachineOptions,
    logger,
    NodeFsLocalProject,
    RepoRef,
} from "@atomist/sdm";
import * as fs from "fs-extra";
import * as path from "path";
import { AutomationClientFinder } from "../../../cli/invocation/http/AutomationClientFinder";
import { addGitHooksToProject } from "../../../cli/setup/addGitHooks";
import { handlePushBasedEventOnRepo } from "../../../common/git/handlePushBasedEventOnRepo";
import { LocalWorkspaceContext } from "../../../common/invocation/LocalWorkspaceContext";
import { invokeEventHandlerInProcess } from "../../invocation/invokeEventHandlerInProcess";
import { lastSha } from "../../util/git";
import { runAndLog } from "../../util/runAndLog";
import {
    sendChannelLinkEvent,
    sendRepoCreationEvent,
    sendRepoOnboardingEvent,
} from "../event/repoOnboardingEvents";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

const InitialCommitMessage = "Initial commit from Atomist";

/**
 * Persist the project to the given local directory given expanded directory
 * conventions. Perform a git init and other after actions, such as installing
 * our git hooks. Fires off the necessary new repo events using HTTP to
 * all local automation clients.
 * @return {ProjectPersister}
 */
export function fileSystemProjectPersister(teamContext: LocalWorkspaceContext,
                                           opts: LocalSoftwareDeliveryMachineOptions,
                                           automationClientFinder: AutomationClientFinder): ProjectPersister {
    return async (p, _, id, params) => {
        const baseDir = `${opts.repositoryOwnerParentDirectory}${path.sep}${id.owner}${path.sep}${id.repo}`;
        const frr = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory: opts.repositoryOwnerParentDirectory,
            mergePullRequests: opts.mergePullRequests,
            baseDir,
        });
        // Override target repo to get file url
        Object.defineProperty((params as any).target, "repoRef", {
            get() {
                return frr;
            },
        });
        logger.info("Persisting to [%s]", baseDir);
        if (await fs.pathExists(baseDir)) {
            throw new Error(`Cannot write new project to [${baseDir}] as this directory already exists`);
        }
        const createdProject = await NodeFsLocalProject.copy(p, baseDir);
        await runAndLog("git init", { cwd: baseDir });
        await runAndLog("git add .", { cwd: baseDir });
        await runAndLog(`git commit -a -m "${InitialCommitMessage}"`, { cwd: baseDir });
        await addGitHooksToProject(createdProject);

        await emitEventsForNewProject(teamContext, opts, createdProject, id, automationClientFinder);
        return successOn(createdProject);
    };
}

/**
 * Send events that should apply to a new project
 */
async function emitEventsForNewProject(workspaceContext: LocalWorkspaceContext,
                                       lc: LocalSoftwareDeliveryMachineOptions,
                                       createdProject: LocalProject,
                                       id: RepoRef,
                                       automationClientFinder: AutomationClientFinder) {
    const eventSender = invokeEventHandlerInProcess(workspaceContext);
    await sendRepoCreationEvent(workspaceContext, id, eventSender);

    const sha = await lastSha(createdProject as GitProject);
    const branch = "master";

    await handlePushBasedEventOnRepo(workspaceContext.workspaceId, eventSender, lc, {
        baseDir: createdProject.baseDir,
        sha,
        branch,
    }, "OnFirstPushToRepo");

    // This is the first push
    await handlePushBasedEventOnRepo(workspaceContext.workspaceId, eventSender, lc, {
        baseDir: createdProject.baseDir,
        sha,
        branch,
    }, "SetGoalsOnPush");

    await sendRepoOnboardingEvent(workspaceContext, id, eventSender);
    await sendChannelLinkEvent(workspaceContext, id, eventSender);
}
