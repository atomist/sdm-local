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


import chalk from "chalk";
import { isListenerRunning } from "../../../../binding/message/httpMessageListener";
import { infoMessage } from "./consoleOutput";

/**
 * Display a message to the console suggesting starting the listener
 * @return {Promise<void>}
 */
export async function suggestStartingAllMessagesListener() {
    const running = await isListenerRunning();
    if (!running) {
        infoMessage(`################### To see a complete message stream from across all commands and events, ` +
            `please start the Slalom listener by typing\n\t${chalk.yellow("@atomist listen")}\n###################\n\n`);
    }
}
