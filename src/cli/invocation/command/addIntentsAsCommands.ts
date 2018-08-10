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
import * as _ from "lodash";
import { Argv } from "yargs";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { logExceptionsToConsole } from "../../ui/consoleOutput";
import { PathElement, toPaths } from "../../util/PathElement";
import { PostToAtomistListenerListener, ShowDescriptionListener } from "./support/commandInvocationListeners";
import { exposeParameters } from "./support/exposeParameters";
import { runCommandOnColocatedAutomationClient } from "./support/runCommandOnColocatedAutomationClient";

/**
 * Add commands for all intents
 * @param {yargs.Argv} yargs
 * @param allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function addIntentsAsCommands(ai: AutomationClientInfo,
    yargs: Argv, allowUserInput: boolean = true) {
    const handlers = ai.client.commands
        .filter(hm => !!hm.intent && hm.intent.length > 0);

    // Build all words
    const sentences: string[][] =
        _.flatten(handlers.map(hm => hm.intent)).map(words => words.split(" "));
    const paths: PathElement[] = toPaths(sentences);
    paths.forEach(pe => exposeAsCommands(ai, pe, yargs, [], allowUserInput));
}

/**
 * Expose commands for the given path. We expose both the exact
 * case (e.g. "Do Thing now") and the lower case ("do thing now")
 * as it's not feasible to be case insensitive like the Atomist bot.
 * @param {PathElement} pe
 * @param {yargs.Argv} nested
 * @param {string[]} previous
 * @param {boolean} allowUserInput
 */
function exposeAsCommands(ai: AutomationClientInfo,
    pe: PathElement,
    nested: Argv,
    previous: string[],
    allowUserInput: boolean) {
    const intent = previous.concat([pe.name]).join(" ");
    const commandForCompletedIntent = ai.client.commands.find(hm => hm.intent.includes(intent));

    if (pe.kids.length > 0) {
        // Expose both lower case and actual case name
        const names = _.uniq([pe.name, pe.name.toLowerCase()]);
        names.forEach(name =>
            nested.command({
                command: name,
                describe: `${name} -> ${pe.kids.map(k => k.name).join("/")}`,
                builder: yargs => {
                    pe.kids.forEach(kid =>
                        exposeAsCommands(ai, kid, yargs, previous.concat(pe.name), allowUserInput));
                    if (!!commandForCompletedIntent) {
                        exposeParameters(commandForCompletedIntent, yargs, allowUserInput);
                    } else {
                        yargs.demandCommand();
                    }
                    return yargs;
                },
                handler: !!commandForCompletedIntent ? async argv => {
                    logger.debug("Args are %j", argv);
                    return logExceptionsToConsole(
                        () => runByIntent(ai, intent, argv as any),
                        ai.connectionConfig.showErrorStacks);
                } : undefined
            }));
    } else {
        const names = _.uniq([pe.name, pe.name.toLowerCase()]);
        names.forEach(name =>
            nested.command({
                command: name,
                describe: commandForCompletedIntent.description,
                handler: async argv => {
                    logger.debug("Args are %j", argv);
                    return logExceptionsToConsole(() => runByIntent(ai, intent, argv),
                        ai.connectionConfig.showErrorStacks);
                },
                builder: yargs => exposeParameters(commandForCompletedIntent, yargs, allowUserInput),
            }));
    }
}

async function runByIntent(ai: AutomationClientInfo,
    intent: string,
    command: any): Promise<any> {
    // writeToConsole({ message: `Recognized intent "${intent}"...`, color: "cyan" });
    const hm = ai.client.commands.find(h => !!h.intent && h.intent.includes(intent));
    if (!hm) {
        process.stdout.write(`No command with intent [${intent}]: Known intents are \n${ai.client.commands
            .map(m => "\t" + m.intent).sort().join("\n")}`);
        process.exit(1);
    }
    return runCommandOnColocatedAutomationClient(ai.connectionConfig,
        ai.localConfig.repositoryOwnerParentDirectory,
        {
            atomistTeamName: ai.connectionConfig.atomistTeamId,
            atomistTeamId: ai.connectionConfig.atomistTeamName,
        },
        hm, command, [ShowDescriptionListener, PostToAtomistListenerListener]);
}
