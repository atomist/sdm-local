/*
 * Copyright © 2019 Atomist, Inc.
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

import {
    SlackDestination,
    toStringArray,
} from "@atomist/automation-client";
import {
    PushFields,
    SdmGoalEvent,
} from "@atomist/sdm";
import * as bodyParser from "body-parser";
import * as express from "express";
// tslint:disable-next-line:no-implicit-dependencies
import * as core from "express-serve-static-core";
import * as http from "http";
import {
    errorMessage,
    infoMessage,
} from "../../cli/ui/consoleOutput";
import { CommandCompletionDestination } from "../../common/ui/CommandCompletionDestination";
import {
    AllMessagesPort,
    GoalRoute,
    MessageRoute,
} from "../../common/ui/httpMessaging";
import { canConnectTo } from "../../common/util/http/canConnectTo";
import { isSdmGoalStoreOrUpdate } from "../binding/message/GoalEventForwardingMessageClient";
import { determineDefaultHostUrl } from "../configuration/defaultLocalSoftwareDeliveryMachineConfiguration";
import { isFailureMessage } from "../configuration/support/NotifyOnCompletionAutomationEventListener";
import { ConsoleGoalRendering } from "./ConsoleGoalRendering";
import {
    ConsoleMessageClient,
    ProcessStdoutSender,
} from "./ConsoleMessageClient";

/**
 * Construction arguments to HttpMessageListener
 */
export class HttpMessageListenerParameters {

    public readonly port: number;

    /**
     * True if this is a short-lived listener that can be shut down
     * once it's seen a command completion event
     */
    public readonly transient: boolean;

    /**
     * If this is set, a list of channels we should listen on
     */
    public readonly channels?: string[] | string;

    /**
     * Whether to display information about the invocation of commands.
     * Useful when developing SDM commands.
     */
    public readonly verbose?: boolean;

    public readonly goals?: boolean;
}

/**
 * Start process to listen to HTTP POSTs from HttpClientMessageClient
 * and display them to the console. Supports both both structured
 * messages coming from a MessageClient and raw output sent
 * for diagnostic or other purposes.
 * The /message endpoint takes StreamedMessage
 * The /write endpoint takes a simple { message }
 */
export class HttpMessageListener {

    private seenCompletion: boolean;

    private server: http.Server;
    private readonly goalRenderer: ConsoleGoalRendering;

    private readonly channels: string[];

    /**
     * Could this process be terminated, based on its configuration
     * and the events it has seen?
     * @return {boolean}
     */
    get canTerminate(): boolean {
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
        this.addGoalRoute(app);
        this.addWriteRoute(app);
        return this;
    }

    private addMessageRoute(app: core.Express): void {
        app.post(MessageRoute, (req, res, next) => {
            const destinations: SlackDestination[] = req.body.destinations;
            // Shut down the listener
            if (this.parameters.transient && destinations.some((d: any) => d.rootType === CommandCompletionDestination.rootType)) {
                if (isFailureMessage(req.body.message)) {
                    errorMessage("Command failure\n%s\n", req.body.message.error.message);
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

            if (!this.parameters.goals) {
                const messageClient = new ConsoleMessageClient("general", ProcessStdoutSender, req.body.machineAddress);
                return messageClient.send(req.body.message, req.body.destinations)
                    .then(() => res.send("Read message " + JSON.stringify(req.body) + "\n"))
                    .catch(next);
            } else {
                return next();
            }
        });
    }

    private addGoalRoute(app: core.Express): void {
        app.post(GoalRoute, (req, res, next) => {
            const destinations: SlackDestination[] = req.body.destinations;

            if (this.channels.length > 0) {
                // Filter
                if (!this.channels.some(c => destinations.some(d => !!d.channels && d.channels.includes(c)))) {
                    return res.send({ ignored: true });
                }
            }

            if (!this.parameters.goals) {
                return next();
            }

            const body = req.body.message;
            if (isSdmGoalStoreOrUpdate(body)) {
                this.goalRenderer.updateGoal(body as SdmGoalEvent);
            } else if (body.goals && body.push && body.goalSetId) {
                const push = body.push as PushFields.Fragment;
                this.goalRenderer.addGoals(
                    body.goalSetId,
                    body.goals,
                    {
                        owner: push.repo.owner,
                        repo: push.repo.name,
                        branch: push.branch,
                        message: push.after.message,
                        sha: push.after.sha,
                    },
                );
            }

            return next();

        });
    }

    /**
     * Add raw write route
     */
    private addWriteRoute(app: core.Express): void {
        // Raw message point. Ignore if not in verbose mode.
        const verbose = this.parameters.verbose;
        app.post("/write", (req, res) => {
            if (verbose) {
                infoMessage(req.body.message);
            }
            res.send({ received: true, shown: verbose });
        });
        this.server = app.listen(this.parameters.port);
    }

    /**
     * Start process to listen to HTTP messages from HttpClientMessageClient
     * and display them to the console
     */
    constructor(public readonly parameters: HttpMessageListenerParameters) {
        this.channels = toStringArray(parameters.channels || []);
        if (parameters.goals) {
            this.goalRenderer = new ConsoleGoalRendering();
        }
    }
}

/**
 * What will the URL of this listener be?
 * @param {number} demonPort
 * @return {string}
 */
export function messageListenerEndpoint(demonPort: number): string {
    return `http://${determineDefaultHostUrl()}:${demonPort}${MessageRoute}`;
}

export function goalListenerEndpoint(demonPort: number): string {
    return `http://${determineDefaultHostUrl()}:${demonPort}${GoalRoute}`;
}

export function messageListenerRoot(demonPort: number): string {
    return `http://${determineDefaultHostUrl()}:${demonPort}/`;
}

/**
 * Is the all messages message listener running?
 * @param demonPort port to check on
 */
export async function isFeedListenerRunning(demonPort: number = AllMessagesPort): Promise<boolean> {
    return canConnectTo(messageListenerRoot(demonPort));
}
