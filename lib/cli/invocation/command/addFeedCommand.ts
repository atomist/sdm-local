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

import { toStringArray } from "@atomist/automation-client";
import * as os from "os";
import { AllMessagesPort } from "../../../common/ui/httpMessaging";
import {
    HttpMessageListener,
    isFeedListenerRunning,
} from "../../../sdm/ui/HttpMessageListener";
import {
    adviceDoc,
    infoMessage,
    logExceptionsToConsole,
} from "../../ui/consoleOutput";
import { YargBuilder } from "./support/yargBuilder";

/**
 * @param {yargs.Argv} yargs
 */
export function addFeedCommand(yargs: YargBuilder): void {
    yargs.command({
        command: "feed",
        describe: "Start listener daemon to display messages",
        builder: argv => {
            argv.option("channel", {
                description: "Filter to a channel to listen to",
                required: false,
            }).option("verbose", {
                type: "boolean",
                description: "Show information about command invocation",
                default: false,
            }).option("goals", {
                type: "boolean",
                description: "Show only goal executions",
                default: false,
            });
            return argv;
        },
        handler: argv => {
            const channels = toStringArray(argv.channel || []);
            return logExceptionsToConsole(async () => {
                const alreadyRunning = await isFeedListenerRunning();
                const goals = argv.goals && os.platform() !== "win32";
                if (alreadyRunning) {
                    infoMessage("Lifecycle listener is already running\n");
                } else {
                    if (!goals) {
                        if (channels.length > 0) {
                            infoMessage("Atomist feed from all local SDM activity concerning channels [%s] will appear here\n",
                                channels);
                        } else {
                            infoMessage("Atomist feed from all local SDM activity will appear here\n");
                            adviceDoc("docs/onStartListener.md");
                        }
                    }
                    new HttpMessageListener({
                        port: AllMessagesPort,
                        transient: false,
                        channels,
                        verbose: argv.verbose,
                        goals,
                    }).start();
                }
            },
                true);
        },
    });
}
