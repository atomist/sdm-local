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

import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import chalk from "chalk";
import * as _ from "lodash";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { infoMessage, logExceptionsToConsole } from "../../ui/consoleOutput";
import { AutomationClientFinder } from "../http/AutomationClientFinder";
import { YargBuilder } from "./support/yargBuilder";

const MaxColumnWidth = 50;

/**
 * Display the show skills command, backed by the given skills
 * gathered from all connected clients
 * @param {YargBuilder} yargs
 */
export function addShowSkillsCommand(clientFinder: AutomationClientFinder,
                                     yargs: YargBuilder) {
    yargs.command({
        command: "show skills",
        aliases: "s",
        describe: "Show skills",
        handler: async () => {
            const clients = await clientFinder.findAutomationClients();
            return logExceptionsToConsole(
                async () => printSkillsToConsole(clients), true);
    });
}

function printSkillsToConsole(clients: AutomationClientInfo[]) {
    const commands = _.flatten(clients.map(client => client.client.commands));
    infoMessage("%s commands are available from %s connected SDM%s\n\n",
        commands.length,
        clients.length,
        clients.length === 1 ? "" : "s");
    const padLength = Math.max(longestSingleIntentString(commands), MaxColumnWidth);
    infoMessage("%s%s%s\n",
        rightPad("Intent(s)", padLength),
        rightPad("Command name", padLength),
        rightPad("Description", padLength));
    infoMessage("-".padStart(3 * padLength, "-") + "\n");
    commands.forEach(md => {
        let msg = rightPad(chalk.cyan(toIntentString(md)), padLength);
        msg += rightPad(chalk.green(md.name), padLength);
        msg += rightPad(chalk.gray(md.description), padLength);
        infoMessage(msg + "\n");
    });
}

/**
 * Make the string exactly n in length padding as necessary
 * @param {string} s
 * @param {number} n
 * @return {string}
 */
function rightPad(s: string, n: number) {
    return s.substr(0, n).padEnd(n);
}

/**
 * To intent string broken
 * @param {CommandHandlerMetadata} md
 * @return {string}
 */
function toIntentString(md: CommandHandlerMetadata): string {
    return !!md.intent && md.intent.length > 0 ?
        // TODO display more intents
        md.intent.map(intent => `"${intent}"`)[0] : // .join(",\n") :
        "-";
}

function longestSingleIntentString(commands: CommandHandlerMetadata[]): number {
    const winner = commands.reduce((a, b) => {
        const alen = longestIntentStringLength(a);
        const blen = longestIntentStringLength(b);
        return alen > blen ? a : b;
    });
    return longestIntentStringLength(winner);
}

function longestIntentStringLength(command: CommandHandlerMetadata): number {
    return toIntentString(command)
        .split("\n")
        .reduce((a, b) => a.length > b.length ? a : b).length;
}
