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

import * as bodyParser from "body-parser";
import * as express from "express";
import * as http from "http";
import { AllMessagesPort } from "../../cli/invocation/command/addStartListenerCommand";
import { errorMessage, infoMessage } from "../../cli/ui/consoleOutput";
import { CommandCompletionDestination } from "../../common/ui/CommandCompletionDestination";
import { MessageRoute } from "../../common/ui/httpMessaging";
import { canConnectTo } from "../../common/util/http/canConnectTo";
import { defaultHostUrlAliaser } from "../../common/util/http/defaultLocalHostUrlAliaser";
import { isFailureMessage } from "../configuration/support/NotifyOnCompletionAutomationEventListener";
import { ConsoleMessageClient, ProcessStdoutSender } from "./ConsoleMessageClient";

/**
 * Start process to listen to HTTP messages from HttpClientMessageClient
 */
export class HttpMessageListener {

    private seenCompletion: boolean;

    private server: http.Server;

    get canTerminate() {
        return this.transient && this.seenCompletion;
    }

    /**
     * Start process to listen to HTTP messages from HttpClientMessageClient
     * @param {number} port
     * @param transient is this short-lived, for one command?
     */
    constructor(public readonly port: number = AllMessagesPort,
                public readonly transient: boolean = false) {
    }

    public start(): this {
        const app = express();
        app.use(bodyParser.json());

        app.get("/", (req, res) => res.send("Atomist Listener Demon\n"));

        app.post(MessageRoute, (req, res, next) => {
            // Shut down the listener
            if (this.transient && req.body.destinations.some((d: any) => d.rootType === CommandCompletionDestination.rootType)) {
                if (isFailureMessage(req.body.message)) {
                    errorMessage("Command failure\n%j\n", req.body.message);
                }
                this.seenCompletion = true;
                res.send({ terminating: true });
                // This can be slow, so we terminate the process elsewhere
                return this.server.close();
            }
            const messageClient = new ConsoleMessageClient("general", ProcessStdoutSender, req.body.machineAddress);
            return messageClient.send(req.body.message, req.body.destinations)
                .then(() => res.send("Read message " + JSON.stringify(req.body) + "\n"))
                .catch(next);
        });

        this.server = app.listen(this.port,
            () => {
                if (!this.transient) {
                    // It's not a transient destination
                    infoMessage(`Atomist Local SDM: Listening on port ${this.port}...\n`);
                }
            },
        );
        return this;
    }
}

/**
 * What will the URL of this listener be?
 * @param {number} demonPort
 * @return {string}
 */
export function messageListenerEndpoint(demonPort: number): string {
    return `http://${defaultHostUrlAliaser().alias()}:${demonPort}${MessageRoute}`;
}

export function messageListenerRoot(demonPort: number): string {
    return `http://${defaultHostUrlAliaser().alias()}:${demonPort}/`;
}

export async function isListenerRunning(demonPort: number = AllMessagesPort): Promise<boolean> {
    return canConnectTo(messageListenerRoot(demonPort));
}
