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
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { HookEvents } from "../git/handleGitHookEvent";
import { triggerGitEvents } from "../git/triggerGitEvents";
import { logExceptionsToConsole } from "./support/consoleOutput";
import { DefaultTeamContextResolver } from "../../../common/binding/defaultTeamContextResolver";
import { TeamContextResolver } from "../../../common/binding/TeamContextResolver";

/**
 * Add a command to triggerGitEvents execution following a git event
 * @param {yargs.Argv} yargs
 */
export function addTriggerCommand(yargs: Argv,
                                  clients: AutomationClientInfo[],
                                  teamContextResolver: TeamContextResolver) {
    yargs.command({
        command: "trigger <event> [depth]",
        describe: "Trigger commit action on the current repository",
        builder: ra => {
            return ra.positional("event", {
                choices: HookEvents,
            }).positional("depth", {
                type: "number",
                default: 1,
            });
        },
        handler: ya => {
            return logExceptionsToConsole(() =>
                    triggerGitEvents(clients, ya.event, ya.depth, teamContextResolver),
                true);
        },
    });
}
