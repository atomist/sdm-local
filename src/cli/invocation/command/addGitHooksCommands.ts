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

import { expandedTreeRepoFinder } from "../../../sdm/binding/project/expandedTreeRepoFinder";
import { determineCwd } from "../../../sdm/binding/project/expandedTreeUtils";
import { isFileSystemRemoteRepoRef } from "../../../sdm/binding/project/FileSystemRemoteRepoRef";
import { addGitHooks, removeGitHooks } from "../../setup/addGitHooks";
import { logExceptionsToConsole } from "../../ui/consoleOutput";
import { YargBuilder } from "./support/yargBuilder";

/**
 * Command to add git hooks to current directory or all projects
 * @param {yargs.Argv} yargs
 */
export function addAddGitHooksCommand(yargs: YargBuilder) {
    yargs.command({
        command: "add git hooks",
        describe: `Install git hooks to current project, or if 'base' parameter is supplied, under that base`,
        builder: (args: any) => {
            return args.option("base", {
                required: false,
                description: "Base for machine to add",
            });
        },
        handler: (argv: any) => {
            return logExceptionsToConsole(() => installHookOrHooks(argv.base), true);
        },
    });
}

export function addRemoveGitHooksCommand(yargs: YargBuilder) {
    yargs.command({
        command: "remove git hooks",
        describe: `Remove git hooks from all projects, or in current directory if not connected to an SDM`,
        builder: args => {
            return args.option("base", {
                required: false,
                description: "Base for machine to remove",
            });
        },
        handler: args => {
            return logExceptionsToConsole(() => {
                return removeHookOrHooks(args.base);
            }, true);
        },
    });
}

async function installHookOrHooks(repositoryOwnerParentDirectory?: string) {
    if (!repositoryOwnerParentDirectory) {
        return addGitHooks(determineCwd());
    }
    // Install hooks in all directories
    return installAllGitHooks(repositoryOwnerParentDirectory);
}

async function removeHookOrHooks(repositoryOwnerParentDirectory: string) {
    if (!repositoryOwnerParentDirectory) {
        const cwd = determineCwd();
        return removeGitHooks(cwd);
    }
    return removeAllGitHooks(repositoryOwnerParentDirectory);
}

/**
 * * Install git hooks in all git projects under our expanded directory structure
 * @return {Promise<void>}
 */
async function installAllGitHooks(repositoryOwnerParentDirectory: string) {
    const repoFinder = expandedTreeRepoFinder(repositoryOwnerParentDirectory);
    const allRepos = await repoFinder(undefined);
    for (const rr of allRepos) {
        if (!isFileSystemRemoteRepoRef(rr)) {
            throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
        }
        await addGitHooks(determineCwd());
    }
}

async function removeAllGitHooks(repositoryOwnerParentDirectory: string) {
    const repoFinder = expandedTreeRepoFinder(repositoryOwnerParentDirectory);
    const allRepos = await repoFinder(undefined);
    for (const rr of allRepos) {
        if (!isFileSystemRemoteRepoRef(rr)) {
            throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
        }
        await removeGitHooks(rr.fileSystemLocation);
    }
}
