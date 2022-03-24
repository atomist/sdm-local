/*
 * Copyright © 2019 Atomist, Inc.
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

import { WorkspaceContextResolver } from "../../../common/binding/WorkspaceContextResolver";
import {
    determineCwd,
    withinExpandedTree,
} from "../../../sdm/binding/project/expandedTreeUtils";
import { FileSystemRemoteRepoRef } from "../../../sdm/binding/project/FileSystemRemoteRepoRef";
import { shaHistory } from "../../../sdm/util/git";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import {
    errorMessage,
    infoMessage,
} from "../../ui/consoleOutput";
import { renderEventDispatch } from "../../ui/renderClientInfo";
import { handleGitHookEvent } from "./handleGitHookEvent";
import { GitCommandGitProject, logger } from "@atomist/sdm/lib/client";

/**
 * Trigger git events to the given depth in the current project repo,
 * as determined by the current working directory.
 * @param clients clients to onDispatch to
 * @param {string} event
 * @param {number} depth
 * @return {Promise<void>}
 */
export async function triggerGitEvents(clients: AutomationClientInfo[],
                                       event: string,
                                       depth: number,
                                       teamContextResolver: WorkspaceContextResolver): Promise<void> {
    const relevantClients = clients.filter(client => !!client.localConfig && withinExpandedTree(client.localConfig.repositoryOwnerParentDirectory));
    await Promise.all(relevantClients.map(client => triggerGitEventsOn(client, event, depth, teamContextResolver)));
}

async function triggerGitEventsOn(ai: AutomationClientInfo,
                                  event: string,
                                  depth: number,
                                  teamContextResolver: WorkspaceContextResolver): Promise<void> {
    const currentDir = determineCwd();
    const workspaceId = teamContextResolver.workspaceContext.workspaceId;
    if (withinExpandedTree(ai.localConfig.repositoryOwnerParentDirectory, currentDir)) {
        const p = GitCommandGitProject.fromBaseDir(FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory: ai.localConfig.repositoryOwnerParentDirectory,
            mergePullRequests: ai.localConfig.mergePullRequests,
            baseDir: currentDir,
        }),
            currentDir, undefined, () => undefined);
        logger.debug("Trigger %s within [%s], depth=%d", event, currentDir, depth);
        const { branch } = await p.gitStatus();
        // Go back on the current branch
        const shas = (await shaHistory(p))
            .slice(0, depth)
            .reverse();
        for (const sha of shas) {
            if (depth > 1) {
                infoMessage("Sha [%s]\n", sha);
            }
            const invocation = { event, baseDir: currentDir, branch, sha, workspaceId };
            logger.debug("Trigger %j", invocation);
            infoMessage(renderEventDispatch(ai, invocation));
            await handleGitHookEvent(ai.location, ai.localConfig, invocation);
        }
    } else {
        errorMessage(
            "Working directory %s is not within expanded working tree under %s for machine %s\n",
            currentDir,
            ai.localConfig.repositoryOwnerParentDirectory,
            ai.client.name);
    }
}
