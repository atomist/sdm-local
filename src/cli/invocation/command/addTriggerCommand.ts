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

import { sprintf } from "sprintf-js";
import { Argv } from "yargs";
import { WorkspaceContextResolver } from "../../../common/binding/WorkspaceContextResolver";
import { postToListener } from "../../../common/ui/httpMessaging";
import { infoMessage, logExceptionsToConsole } from "../../ui/consoleOutput";
import { HookEvent } from "../git/handleGitHookEvent";
import { triggerGitEvents } from "../git/triggerGitEvents";
import { AutomationClientFinder } from "../http/AutomationClientFinder";
import { suggestStartingAllMessagesListener } from "./support/suggestStartingAllMessagesListener";

/**
 * Add a command to triggerGitEvents execution following a git event
 * @param {yargs.Argv} yargs
 */
export function addTriggerCommand(yargs: Argv,
                                  automationClientFinder: AutomationClientFinder,
                                  teamContextResolver: WorkspaceContextResolver) {
    yargs.command({
        command: "trigger <event> [depth]",
        describe: "Trigger commit action on the current repository",
        builder: ra => {
            return ra.positional("event", {
                choices: Object.values(HookEvent),
            }).positional("depth", {
                type: "number",
                default: 1,
            });
        },
        handler: ya => {
            return logExceptionsToConsole(async () => {
                    const clients = await automationClientFinder.findAutomationClients();
                    const msg = sprintf("Dispatching git event '%s' to %d clients...\n", ya.event, clients.length);
                    infoMessage(msg);
                    await postToListener(msg);
                    await triggerGitEvents(clients, ya.event, ya.depth, teamContextResolver);
                    return suggestStartingAllMessagesListener();
                },
                true);
        },
    });
}
