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
import { HttpMessageListener } from "../../../sdm/ui/HttpMessageListener";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { infoMessage, logExceptionsToConsole } from "../../ui/consoleOutput";

export const AllMessagesPort = 6660;

/**
 * @param {AutomationClientConnectionConfig} connectionConfig
 * @param {yargs.Argv} yargs
 */
export function addStartListenerCommand(yargs: Argv) {
    yargs.command({
        command: "listen",
        describe: "Start listener daemon to display messages",
        handler: () => {
            return logExceptionsToConsole(async () => {
                    await new HttpMessageListener(AllMessagesPort).start();
                    infoMessage("Lifecycle messages from all local SDM activity will appear here\n");
                },
                true);
        },
    });
}
