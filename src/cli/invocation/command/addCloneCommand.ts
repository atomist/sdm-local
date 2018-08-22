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
    Microgrammar,
    optional,
} from "@atomist/microgrammar";
import { exec } from "child_process";
import * as fs from "fs";
import { promisify } from "util";
import { WorkspaceContextResolver } from "../../../common/binding/WorkspaceContextResolver";
import { determineDefaultRepositoryOwnerParentDirectory } from "../../../common/configuration/defaultLocalModeConfiguration";
import { LocalWorkspaceContext } from "../../../common/invocation/LocalWorkspaceContext";
import {
    sendChannelLinkEvent,
    sendRepoOnboardingEvent,
} from "../../../sdm/binding/event/repoOnboardingEvents";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { addGitHooks } from "../../setup/addGitHooks";
import {
    infoMessage,
    logExceptionsToConsole,
    warningMessage,
} from "../../ui/consoleOutput";
import { invokeEventHandlerUsingHttp } from "../http/invokeEventHandlerUsingHttp";
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
        handler: argv => {
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
    const { base, owner, repo } = repoInfo;

    const orgDir = repositoryOwnerDirectory + "/" + owner;
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir);
    }
    infoMessage(`Cloning git remote project from ${base} into ${orgDir}: args to git clone were ${args}\n`);
    infoMessage("Owner=%s, repo=%s, cloning under %s\n", owner, repo, orgDir);
    await promisify(exec)(`git clone ${args}`,
        { cwd: orgDir });
    await addGitHooks(`${repositoryOwnerDirectory}/${owner}/${repo}`);
    for (const client of clients) {
        const eventSender = invokeEventHandlerUsingHttp(
            client.location,
            workspaceContext);
        await sendRepoOnboardingEvent(workspaceContext, { owner, repo }, eventSender);
        await sendChannelLinkEvent(workspaceContext, { owner, repo }, eventSender);
    }
}

export const GitRemoteParser = Microgrammar.fromString<{ base: string, owner: string, repo: string }>(
    "${base}/${owner}/${repo}${dotgit}", {
        base: /http[s]:\/\/[^\/]+/,
        repo: /[^\s^\.]+/,
        dotgit: optional(".git"),
    },
);
