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

import { Destination, MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import axios from "axios";
import * as bodyParser from "body-parser";
import * as express from "express";
import { AllMessagesPort } from "../../../cli/invocation/command/addStartListenerCommand";
import { errorMessage, infoMessage } from "../../../cli/invocation/command/support/consoleOutput";
import { AutomationClientConnectionRequest } from "../../../cli/invocation/http/AutomationClientConnectionConfig";
import { CommandCompletionDestination, isFailureMessage } from "../../configuration/support/NotifyOnCompletionAutomationEventListener";
import { ConsoleMessageClient, ProcessStdoutSender } from "./ConsoleMessageClient";

export const MessageRoute = "/message";

/**
 * Payload data structure used by HTTP message communication
 */
export interface StreamedMessage {
    message: string | SlackMessage;
    destinations: Destination[];
    options: MessageOptions;
    machineAddress: AutomationClientConnectionRequest;
}

/**
 * Start process to listen to HTTP messages from HttpClientMessageClient
 * @param {number} port
 * @param killOnCommandCompletion should this be shut down on command completion
 */
export function startHttpMessageListener(port: number = AllMessagesPort,
                                         killOnCommandCompletion: boolean = false) {
    const app = express();
    app.use(bodyParser.json());

    app.get("/", (req, res) => res.send("Atomist Listener Demon\n"));

    app.post(MessageRoute, (req, res, next) => {
        // Shut down the listener
        if (killOnCommandCompletion && req.body.destinations.some(d => d.rootType === CommandCompletionDestination.rootType)) {
            if (isFailureMessage(req.body.message)) {
                errorMessage("Command failure\n%j\n", req.body.message);
            }
            process.exit(0);
            return;
        }
        const messageClient = new ConsoleMessageClient("general", ProcessStdoutSender, req.body.machineAddress);
        return messageClient.send(req.body.message, req.body.destinations)
            .then(() => res.send("Read message " + JSON.stringify(req.body) + "\n"))
            .catch(next);
    });

    app.listen(port,
        () => {
            if (!killOnCommandCompletion) {
                // It's not a transient destination
                infoMessage(`Atomist Local SDM: Listening on port ${port}...\n`);
            }
        },
    );
}

/**
 * What will the URL of this listener be?
 * @param {number} demonPort
 * @return {string}
 */
export function messageListenerEndpoint(demonPort: number): string {
    return `http://localhost:${demonPort}${MessageRoute}`;
}

export function messageListenerRoot(demonPort: number): string {
    return `http://localhost:${demonPort}/`;
}

export async function isListenerRunning(demonPort: number = AllMessagesPort): Promise<boolean> {
    try {
        await axios.get(messageListenerRoot(demonPort));
        return true;
    } catch (err) {
        return false;
    }
}
