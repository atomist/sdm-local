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
import { startHttpMessageListener } from "../../../binding/message/httpMessageListener";
import { AutomationClientConnectionConfig } from "../../http/AutomationClientConnectionConfig";
import { logExceptionsToConsole } from "./support/consoleOutput";

export const AllMessagesPort = 6660;

export function addStartListenerCommand(connectionConfig: AutomationClientConnectionConfig, yargs: Argv) {
    yargs.command({
        command: "listen",
        describe: "Start listener daemon to display messages",
        handler: () => {
            return logExceptionsToConsole(async () =>
                    startHttpMessageListener(connectionConfig, AllMessagesPort),
                connectionConfig.showErrorStacks);
        },
    });
}
