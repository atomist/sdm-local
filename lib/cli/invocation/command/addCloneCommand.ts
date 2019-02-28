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

import {
    Microgrammar,
    optional,
} from "@atomist/microgrammar";
import { WorkspaceContextResolver } from "../../../common/binding/WorkspaceContextResolver";
import { LocalWorkspaceContext } from "../../../common/invocation/LocalWorkspaceContext";
import { determineDefaultRepositoryOwnerParentDirectory } from "../../../sdm/configuration/defaultLocalSoftwareDeliveryMachineConfiguration";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import {
    logExceptionsToConsole,
    warningMessage,
} from "../../ui/consoleOutput";
import { cloneAndAtomize } from "./support/cloneAndAtomize";
import { YargBuilder } from "./support/yargBuilder";

/*
 * Args we'll simply pass through without examining
 * git clone [--template=<template_directory>]
	  [-l] [-s] [--no-hardlinks] [-q] [-n] [--bare] [--mirror]
	  [-o <name>] [-b <name>] [-u <upload-pack>] [--reference <repository>]
	  [--dissociate] [--separate-git-dir <git dir>]
	  [--depth <depth>] [--[no-]single-branch] [--no-tags]
	  [--recurse-submodules[=<pathspec>]] [--[no-]shallow-submodules]
	  [--jobs <n>] [--] <repository> [<directory>]
 */
const GitCloneArgs = [
    "b",
    // "bare", -- We don't support this as it's impossible to install git hooks on a bare repo
    "depth",
    "directory",
    "dissocate",
    "jobs",
    "l",
    "mirror",
    "n",
    "no-hardlinks",
    "no-shallow-submodules",
    "no-single-branch",
    "no-tags",
    "o",
    "q",
    "recurse-submodules",
    "reference",
    "repository",
    "s",
    "separate-git-dir",
    "shallow-submodules",
    "single-branch",
    "template",
    "upload-pack",
];

/**
 * Takes the same arguments as Git clone but onboards the repo with Atomist.
 * We suppress certain flags like 'bare' as they don't make sense when we need
 * to install Atomist git hooks.
 * @param {AutomationClientInfo[]} clients
 * @param {YargBuilder} yargs
 * @param workspaceContextResolver
 */
export function addCloneCommand(clients: AutomationClientInfo[],
                                yargs: YargBuilder,
                                workspaceContextResolver: WorkspaceContextResolver) {
    yargs.command({
        command: "clone <args>",
        describe: "Like git clone but also onboards the repo with Atomist " +
            `under the Atomist root at ${determineDefaultRepositoryOwnerParentDirectory()}`,
        builder: a => {
            GitCloneArgs.forEach(arg => {
                a.option(arg, {
                    // TODO might be nice to split these into options and flags
                    // but we are letting git clone do the validation
                    boolean: true,
                    required: false,
                });
            });
            return a;
        },
        handler: () => {
            if (process.argv.length < 3) {
                warningMessage("Not enough arguments to git or atomist clone\n");
                return undefined;
            }
            const argsToGitClone = process.argv.slice(3).join(" ");
            return logExceptionsToConsole(async () => {
                await superclone(clients,
                    argsToGitClone,
                    workspaceContextResolver.workspaceContext);
            }, true);
        },
    });
}

async function superclone(clients: AutomationClientInfo[],
                          args: string,
                          workspaceContext: LocalWorkspaceContext): Promise<any> {
    const repositoryOwnerDirectory = determineDefaultRepositoryOwnerParentDirectory();
    const repoInfo = GitRemoteParser.firstMatch(args);
    if (!repoInfo) {
        warningMessage("Cannot parse repo info from %s\n", args);
        return;
    }
    const { owner, repo } = repoInfo;
    return cloneAndAtomize({
        repositoryOwnerDirectory,
        owner,
        repo,
        cloneCommand: `git clone ${args}`,
        clients,
        workspaceContext,
    });
}

/**
 * Parse a command line to git clone, e.g. git clone https://github.com/owner/repo
 * @type {Microgrammar<{base: string; owner: string; repo: string}>}
 */
export const GitRemoteParser = Microgrammar.fromString<{ base: string, owner: string, repo: string }>(
    "${base}${sep}${owner}/${repo}${dotgit}", {
        base: /(git@|https?:\/\/)[^:\/]+/,
        sep: /[:\/]/,
        owner: /[^\s\.\/]+/,
        repo: /[^\s\.]+/,
        dotgit: optional(".git"),
    },
);
