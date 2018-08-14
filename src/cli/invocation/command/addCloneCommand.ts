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

import { Microgrammar } from "@atomist/microgrammar/Microgrammar";
import { optional } from "@atomist/microgrammar/Ops";
import { exec } from "child_process";
import * as fs from "fs";
import { promisify } from "util";
import { determineDefaultRepositoryOwnerParentDirectory } from "../../../common/configuration/defaultLocalModeConfiguration";
import { sendChannelLinkEvent, sendRepoOnboardingEvent } from "../../../sdm/binding/event/repoOnboardingEvents";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { addGitHooks } from "../../setup/addGitHooks";
import { infoMessage, logExceptionsToConsole } from "../../ui/consoleOutput";
import { invokeEventHandlerUsingHttp } from "../http/invokeEventHandlerUsingHttp";
import { YargBuilder } from "./support/yargBuilder";

/**
 * Takes the same arguments as Git clone but onboards the repo with Atomist
 * @param {AutomationClientInfo[]} clients
 * @param {YargBuilder} yargs
 */
export function addCloneCommand(clients: AutomationClientInfo[], yargs: YargBuilder) {
    yargs.command({
        command: "clone <args>",
        describe: "Like git clone but onboards the repo with Atomist",
        handler: argv => {
            return logExceptionsToConsole(async () => {
                await superclone(clients, argv.args);
            }, true);
        },
    });
}

async function superclone(clients: AutomationClientInfo[],
                          args: string): Promise<any> {
    infoMessage(`Importing Git remote project ${args}\n`);
    const repositoryOwnerDirectory = determineDefaultRepositoryOwnerParentDirectory();
    const { owner, repo } = GitRemoteParser.firstMatch(args);
    const orgDir = repositoryOwnerDirectory + "/" + owner;
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir);
    }
    infoMessage("Owner=%s, repo=%s, cloning under %s\n", owner, repo, orgDir);
    await promisify(exec)(`git clone ${args}`,
        { cwd: orgDir });
    await addGitHooks(`${repositoryOwnerDirectory}/${owner}/${repo}`);
    for (const client of clients) {
        const eventSender = invokeEventHandlerUsingHttp(client.connectionConfig, client.connectionConfig);
        await sendRepoOnboardingEvent(client.connectionConfig, { owner, repo }, eventSender);
        await sendChannelLinkEvent(client.connectionConfig, { owner, repo }, eventSender);
    }
}

export const GitRemoteParser = Microgrammar.fromString<{ base: string, owner: string, repo: string }>(
    "${base}/${owner}/${repo}${dotgit}", {
        base: /http[s]:\/\/[^\/]+/,
        repo: /[^\s^\.]+/,
        dotgit: optional(".git"),
    },
);
