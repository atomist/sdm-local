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
import { sprintf } from "sprintf-js";
import { toStringArray } from "../../../../node_modules/@atomist/automation-client/internal/util/string";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { infoMessage, logExceptionsToConsole } from "../../ui/consoleOutput";
import { AutomationClientFinder } from "../http/AutomationClientFinder";
import { YargBuilder } from "./support/yargBuilder";

const MaxColumnWidth = 30;

/**
 * Display the show skills command, backed by the given skills
 * gathered from all connected clients
 * @param clientFinder help find connected clients
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
        },
    });
}

function printSkillsToConsole(clients: AutomationClientInfo[]) {
    const commands = _.flatten(clients.map(client => client.client.commands));
    infoMessage("%s commands are available from %s connected SDM%s\n\n",
        commands.length,
        clients.length,
        clients.length === 1 ? "" : "s");
    const padLength = Math.max(longestSingleIntentString(commands), MaxColumnWidth);
    const longestCommandNameLength = Math.max(
        commands.length === 0 ? 0 : commands.map(c => c.name).reduce((a, b) => a.length > b.length ? a : b).length + 5,
        MaxColumnWidth);
    const separatorLength = 2 * padLength + longestCommandNameLength;
    infoMessage("%s%s%s\n",
        chalk.italic("Intent".padEnd(padLength)),
        chalk.italic("Command name".padEnd(longestCommandNameLength)),
        chalk.italic("Description".padEnd(padLength)),
    );
    infoMessage("%s\n", "=".repeat(separatorLength));
    const commandChunks = commands.map(md =>
        sprintf("%s%s%s\n",
            chalk.bold(paddedIntentString(md, padLength)),
            chalk.gray(md.name.padEnd(longestCommandNameLength)),
            chalk.italic(md.description),
        ));
    const separator = sprintf("%s\n", chalk.gray("-".repeat(separatorLength)));
    infoMessage(commandChunks.join(separator));
}

function paddedIntentString(md: CommandHandlerMetadata, n: number): string {
    const arrays: string[] = !!md.intent && md.intent.length > 0 ?
        md.intent :
        [""];
    // Pad last element
    arrays[arrays.length - 1] = arrays[arrays.length - 1].padEnd(n);
    return arrays.join("\n");
}

function longestSingleIntentString(commands: CommandHandlerMetadata[]): number {
    if (commands.length === 0) {
        return 0;
    }
    const winner = commands.reduce((a, b) => {
        const alen = longestIntentStringLength(a);
        const blen = longestIntentStringLength(b);
        return alen > blen ? a : b;
    });
    return longestIntentStringLength(winner);
}

function longestIntentStringLength(command: CommandHandlerMetadata): number {
    const intents = toStringArray(command.intent || []);
    return intents.length > 0 ?
        intents.reduce((a, b) => a.length > b.length ? a : b).length :
        0;
}
