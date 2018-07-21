import { Argv } from "yargs";
import { infoMessage, logExceptionsToConsole } from "../support/consoleOutput";
import { Destination, MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import * as express from "express";
import { ConsoleMessageClient } from "../io/ConsoleMessageClient";

import * as bodyParser from "body-parser";
import { AutomationClientInfo } from "../../config";

export const DemonPort = 6660;
export const MessageRoute = "/message";

export function addStartListener(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "listen",
        describe: "Start listener daemon to display messages and expose commands",
        handler: () => {
            return logExceptionsToConsole(() => summonDemon(ai), ai.localConfig.showErrorStacks);
        },
    });
}

export interface StreamedMessage {
    message: string | SlackMessage;
    destinations: Destination[];
    options: MessageOptions;
}

async function summonDemon(ai: AutomationClientInfo) {
    const messageClient = new ConsoleMessageClient("general");

    const app = express();
    app.use(bodyParser.json());

    app.get("/", (req, res) => res.send("Atomist Listener Demon\n"));

    app.post(MessageRoute, (req, res, next) => {
        return messageClient.send(req.body.message, req.body.destinations)
            .then(() => res.send("Read message " + JSON.stringify(req.body) + "\n"))
            .catch(next);
    });

    app.listen(DemonPort,
        () => infoMessage(`Atomist Slalom: Listening on port ${DemonPort}...\n`),
    );
}

