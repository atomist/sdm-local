import { Argv } from "yargs";
import { logExceptionsToConsole, writeToConsole } from "../support/consoleOutput";

import { CommandInvocation } from "@atomist/automation-client/internal/invoker/Payload";
import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { Destination, MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import * as express from "express";
import { Express } from "express";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { ConsoleMessageClient } from "../io/ConsoleMessageClient";

export const DemonPort = 6660;
export const MessageRoute = "/message";

export function addSummonDemon(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "summon-demon",
        describe: "Summon the Atomist listener demon",
        handler: () => {
            return logExceptionsToConsole(() => summonDemon(sdm));
        },
    });
}

export interface StreamedMessage {
    message: string | SlackMessage;
    destinations: Destination[];
    options: MessageOptions;
}

async function summonDemon(sdm: LocalSoftwareDeliveryMachine) {
    const messageClient = new ConsoleMessageClient();

    writeToConsole({ message: "Your friendly neighborhood demon.\nI am here!", color: "cyan"});
    const app = express();
    app.use(express.json());

    app.get("/", (req, res) => res.send("Atomist Listener Demon\n"));

    app.post(MessageRoute, (req, res, next) => {
        return messageClient.send(req.body.message, req.body.destinations)
            .then(() => res.send("Read message " + JSON.stringify(req.body) + "\n"))
            .catch(next);
    });

    sdm.commandsMetadata.forEach(hmd => exportHandlerRoute(app, hmd, sdm));

    app.listen(DemonPort,
        () => writeToConsole({
            message: `Listening on port ${DemonPort}!`,
            color: "cyan",
        }));
}

function exportHandlerRoute(e: Express, hmd: CommandHandlerMetadata, sdm: LocalSoftwareDeliveryMachine) {
    e.get(`/command/${hmd.name}`, async (req, res) => {
        const ci: CommandInvocation = {
            name: hmd.name,
            args: Object.getOwnPropertyNames(req.query).map(prop => ({ name: prop, value: req.query[prop]})),
        };
        // TODO redirect output??
        await sdm.executeCommand(ci);
        return res.send(`Executed command '${hmd.name}'`);
    });
}
