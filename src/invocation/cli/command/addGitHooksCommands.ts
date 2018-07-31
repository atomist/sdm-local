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

import { Argv } from "yargs";
import {
    addGitHooks,
    removeGitHooks,
} from "../../../setup/addGitHooks";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { logExceptionsToConsole } from "./support/consoleOutput";
import { FileSystemRemoteRepoRef, isFileSystemRemoteRepoRef } from "../../../sdm/binding/project/FileSystemRemoteRepoRef";
import { LocalMachineConfig } from "../../../machine/LocalMachineConfig";
import { parseOwnerAndRepo, determineCwd } from "../../../sdm/binding/project/expandedTreeUtils";
import { expandedTreeRepoFinder } from "../../../sdm/binding/project/expandedTreeRepoFinder";

/**
 * Command to add git hooks to current directory or all projects
 * @param ai config
 * @param {yargs.Argv} yargs
 */
export function addAddGitHooksCommand(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "add-git-hooks",
        describe: `Install git hooks for projects under ${ai.localConfig.repositoryOwnerParentDirectory}`,
        handler: () => {
            return logExceptionsToConsole(() => installHookOrHooks(ai.localConfig), ai.connectionConfig.showErrorStacks);
        },
    });
}

export function addRemoveGitHooksCommand(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "remove-git-hooks",
        describe: `Remove git hooks for projects managed by this SDM, or in current directory if not connected to an SDM`,
        handler: () => {
            return logExceptionsToConsole(() => {
                return removeHookOrHooks(!!ai ? ai.localConfig : undefined);
            }, ai.connectionConfig.showErrorStacks);
        },
    });
}

async function installHookOrHooks(lc: LocalMachineConfig) {
    const repositoryOwnerParentDirectory = lc.repositoryOwnerParentDirectory;
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory);
    if (!!owner && !!repo) {
        const rrr = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir: determineCwd(),
        });
        return addGitHooks(rrr, rrr.fileSystemLocation);

    }
    return installAllGitHooks(lc);
}

async function removeHookOrHooks(lc?: LocalMachineConfig) {
    if (!lc) {
        const cwd = determineCwd();
        return removeGitHooks(cwd);
    }
    const repositoryOwnerParentDirectory = lc.repositoryOwnerParentDirectory;
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory);
    if (!!owner && !!repo) {
        const id = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir: determineCwd(),
        });
        return removeGitHooks(id.fileSystemLocation);
    }
    return removeAllGitHooks(lc);
}

/**
 * * Install git hooks in all git projects under our expanded directory structure
 * @return {Promise<void>}
 */
async function installAllGitHooks(lc: LocalMachineConfig) {
    const repoFinder = expandedTreeRepoFinder(lc.repositoryOwnerParentDirectory);
    const allRepos = await repoFinder(undefined);
    for (const rr of allRepos) {
        if (!isFileSystemRemoteRepoRef(rr)) {
            throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
        }
        await addGitHooks(rr, rr.fileSystemLocation);
    }
}

async function removeAllGitHooks(lc: LocalMachineConfig) {
    const repoFinder = expandedTreeRepoFinder(lc.repositoryOwnerParentDirectory);
    const allRepos = await repoFinder(undefined);
    for (const rr of allRepos) {
        if (!isFileSystemRemoteRepoRef(rr)) {
            throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
        }
        await removeGitHooks(rr.fileSystemLocation);
    }
}
