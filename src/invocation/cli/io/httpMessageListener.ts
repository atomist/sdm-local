import { Destination, MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import * as express from "express";
import { ConsoleMessageClient, ProcessStdoutSender } from "../io/ConsoleMessageClient";
import { infoMessage } from "../support/consoleOutput";

import * as bodyParser from "body-parser";
import { CommandCompletionDestination } from "../../../machine/localPostProcessor";

export const MessageRoute = "/message";

/**
 * Payload data structure used by HTTP message communication
 */
export interface StreamedMessage {
    message: string | SlackMessage;
    destinations: Destination[];
    options: MessageOptions;
}

/**
 * Listen to HTTP messages from HttpClientMessageClient
 * @param {number} demonPort
 * @param killOnCommandCompletion should this be shut down on command completion
 */
export function startHttpMessageListener(demonPort: number, killOnCommandCompletion: boolean = false) {
    const messageClient = new ConsoleMessageClient("general", ProcessStdoutSender);
    const app = express();
    app.use(bodyParser.json());

    app.get("/", (req, res) => res.send("Atomist Listener Demon\n"));

    app.post(MessageRoute, (req, res, next) => {
        if (killOnCommandCompletion && req.body.destinations.some(d => d.rootType === CommandCompletionDestination.rootType)) {
            process.exit(0);
            return;
        }
        return messageClient.send(req.body.message, req.body.destinations)
            .then(() => res.send("Read message " + JSON.stringify(req.body) + "\n"))
            .catch(next);
    });

    app.listen(demonPort,
        () => {
            if (!killOnCommandCompletion) {
                infoMessage(`Atomist Slalom: Listening on port ${demonPort}...\n`);
            }
        },
    );
}

/**
 * What will the URL of this listener be?
 * @param {number} demonPort
 * @return {string}
 */
export function listenerUrl(demonPort: number): string {
    return `http://localhost:${demonPort}${MessageRoute}`;
}
