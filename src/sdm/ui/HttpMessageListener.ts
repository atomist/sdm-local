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

import { SlackDestination } from "@atomist/automation-client";
import { toStringArray } from "@atomist/automation-client/internal/util/string";
import * as bodyParser from "body-parser";
import * as express from "express";
import * as core from "express-serve-static-core";
import * as http from "http";
import { errorMessage, infoMessage } from "../../cli/ui/consoleOutput";
import { CommandCompletionDestination } from "../../common/ui/CommandCompletionDestination";
import { AllMessagesPort, MessageRoute } from "../../common/ui/httpMessaging";
import { canConnectTo } from "../../common/util/http/canConnectTo";
import { defaultHostUrlAliaser } from "../../common/util/http/defaultLocalHostUrlAliaser";
import { isFailureMessage } from "../configuration/support/NotifyOnCompletionAutomationEventListener";
import { ConsoleMessageClient, ProcessStdoutSender } from "./ConsoleMessageClient";

export class HttpMessageListenerParameters {
    public readonly port: number;
    public readonly transient: boolean;
    public readonly channels?: string[] | string;
    public readonly verbose?: boolean;
}

/**
 * Start process to listen to HTTP POSTs from HttpClientMessageClient
 * and display them to the console.
 * The /message endpoint takes StreamedMessage
 * The /write endpoint takes a simple { message }
 */
export class HttpMessageListener {

    private seenCompletion: boolean;

    private server: http.Server;

    private readonly channels: string[];

    /**
     * Could this process be terminated, based on its configuration
     * and the events it has seen?
     * @return {boolean}
     */
    get canTerminate() {
        return this.parameters.transient && this.seenCompletion;
    }

    /**
     * Start the server process
     * @return {this}
     */
    public start(): this {
        const app = express();
        app.use(bodyParser.json());

        app.get("/", (req, res) => res.send("Atomist Listener Daemon\n"));

        this.addMessageRoute(app);
        this.addWriteRoute(app);
        return this;
    }

    private addMessageRoute(app: core.Express) {
        app.post(MessageRoute, (req, res, next) => {
            const destinations: SlackDestination[] = req.body.destinations;
            // Shut down the listener
            if (this.parameters.transient && destinations.some((d: any) => d.rootType === CommandCompletionDestination.rootType)) {
                if (isFailureMessage(req.body.message)) {
                    errorMessage("Command failure\n%j\n", req.body.message);
                }
                this.seenCompletion = true;
                res.send({ terminating: true });
                // This can be slow, so we terminate the process elsewhere
                return this.server.close();
            }

            if (this.channels.length > 0) {
                // Filter
                if (!this.channels.some(c => destinations.some(d => !!d.channels && d.channels.includes(c)))) {
                    return res.send({ ignored: true });
                }
            }

            const messageClient = new ConsoleMessageClient("general", ProcessStdoutSender, req.body.machineAddress);
            return messageClient.send(req.body.message, req.body.destinations)
                .then(() => res.send("Read message " + JSON.stringify(req.body) + "\n"))
                .catch(next);
        });
    }

    /**
     * Add raw write route
     */
    private addWriteRoute(app: core.Express) {
        // Raw message point. Ignore if not in verbose mode.
        const verbose = this.parameters.verbose === true;
        app.post("/write", (req, res) => {
            if (verbose) {
                infoMessage(req.body.message);
            }
            res.send({ received: true, shown: verbose });
        });

        this.server = app.listen(this.parameters.port,
            () => {
                if (!this.parameters.transient) {
                    // It's not a transient destination
                    infoMessage(`Atomist Local SDM: Listening on port ${this.parameters.port}...\n`);
                }
            },
        );
    }

    /**
     * Start process to listen to HTTP messages from HttpClientMessageClient
     * and display them to the console
     */
    constructor(public readonly parameters: HttpMessageListenerParameters) {
        this.channels = toStringArray(parameters.channels || []);
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
