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
import { WorkspaceContextResolver } from "../../../common/binding/WorkspaceContextResolver";
import { postToListener } from "../../../common/ui/httpMessaging";
import { infoMessage, logExceptionsToConsole } from "../../ui/consoleOutput";
import { HookEvent } from "../git/handleGitHookEvent";
import { triggerGitEvents } from "../git/triggerGitEvents";
import { AutomationClientFinder } from "../http/AutomationClientFinder";
import { suggestStartingAllMessagesListener } from "./support/suggestStartingAllMessagesListener";
import { yargCommandWithPositionalArguments, YargSaver } from "./support/yargSaver";

/**
 * Add a command to replay execution following a git event
 * @param {YargSaver} yargs
 */
export function addReplayCommand(yargs: YargSaver,
                                 automationClientFinder: AutomationClientFinder,
                                 teamContextResolver: WorkspaceContextResolver) {
    yargs.withSubcommand(yargCommandWithPositionalArguments({
        command: "replay <event> [depth]",
        describe: "Replay commit action on the current repository",
        positional: [{
            key: "event", opts: {
                choices: Object.values(HookEvent),
            },
        }, {
            key: "depth", opts: {
                type: "number",
                default: 1,
            },
        }],
        handler: ya => {
            return logExceptionsToConsole(async () => {
                const clients = await automationClientFinder.findAutomationClients();
                const msg = sprintf("Dispatching git event '%s' to %d clients...\n",
                    ya.event,
                    clients.length);
                infoMessage(msg);
                await postToListener(msg);
                await triggerGitEvents(clients, ya.event, ya.depth, teamContextResolver);
                return suggestStartingAllMessagesListener();
            },
                true);
        },
    }));
}
