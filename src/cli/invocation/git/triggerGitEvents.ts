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
import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
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
} from "../command/support/consoleOutput";
import { handleGitHookEvent } from "./handlePushBasedEventOnRepo";

/**
 * Trigger git events to the given depth in the current project repo
 * @param {AutomationClientInfo} ai
 * @param {string} event
 * @param {number} depth
 * @return {Promise<void>}
 */
export async function triggerGitEvents(ai: AutomationClientInfo, event: string, depth: number) {
    const currentDir = determineCwd();
    if (withinExpandedTree(ai.localConfig.repositoryOwnerParentDirectory, currentDir)) {
        const p = GitCommandGitProject.fromBaseDir(FileSystemRemoteRepoRef.fromDirectory({
                repositoryOwnerParentDirectory: ai.localConfig.repositoryOwnerParentDirectory,
                baseDir: currentDir,
            }),
            currentDir, null, () => null);
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
            const invocation = { event, baseDir: currentDir, branch, sha };
            logger.debug("Trigger %j", invocation);
            await handleGitHookEvent(ai.connectionConfig, ai.localConfig, invocation);
        }
    } else {
        errorMessage(
            `Working directory ${currentDir} is not within expanded working tree under ${ai.localConfig.repositoryOwnerParentDirectory}`);
        process.exit(1);
    }
}
