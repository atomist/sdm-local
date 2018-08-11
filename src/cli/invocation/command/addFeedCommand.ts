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

import { toStringArray } from "@atomist/automation-client/internal/util/string";
import { AllMessagesPort } from "../../../common/ui/httpMessaging";
import { HttpMessageListener, isListenerRunning } from "../../../sdm/ui/HttpMessageListener";
import { infoMessage, logExceptionsToConsole } from "../../ui/consoleOutput";
import { YargSaver } from "./support/YargSaver";

/**
 * @param {yargs.Argv} yargs
 */
export function addFeedCommand(yargs: YargSaver) {
    yargs.command({
        command: "feed",
        describe: "Start listener daemon to display messages",
        builder: argv => {
            argv.option("channel", {
                required: false,
            });
            return argv;
        },
        handler: argv => {
            const channels = toStringArray(argv.channel || []);
            return logExceptionsToConsole(async () => {
                    const alreadyRunning = await isListenerRunning();
                    if (alreadyRunning) {
                        infoMessage("Lifecycle listener is already running\n");
                    } else {
                        new HttpMessageListener({
                            port: AllMessagesPort,
                            transient: false,
                            channels,
                        }).start();
                        if (channels.length > 0) {
                            infoMessage("Atomist feed from all local SDM activity concerning channels [%s] will appear here\n",
                                channels);
                        } else {
                            infoMessage("Atomist feed from all local SDM activity will appear here\n");

                        }
                    }
                },
                true);
        },
    });
}
