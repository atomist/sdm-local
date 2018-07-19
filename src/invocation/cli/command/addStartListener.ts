import { Argv } from "yargs";
import { infoMessage, logExceptionsToConsole } from "../support/consoleOutput";

import { CommandInvocation } from "@atomist/automation-client/internal/invoker/Payload";
import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { Destination, MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import * as express from "express";
import { Express } from "express";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { ConsoleMessageClient } from "../io/ConsoleMessageClient";
import { GitHookInvocation, handleGitHookEvent, HookEvents } from "../../../setup/gitHooks";
import { runOnGitHook } from "../../..";

export const DemonPort = 6660;
export const MessageRoute = "/message";

export function addStartListener(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "listen",
        describe: "Start listener daemon to display messages and expose commands",
        handler: () => {
            return logExceptionsToConsole(() => summonDemon(sdm), sdm.configuration.showErrorStacks);
        },
    });
}

export interface StreamedMessage {
    message: string | SlackMessage;
    destinations: Destination[];
    options: MessageOptions;
}

async function summonDemon(sdm: LocalSoftwareDeliveryMachine) {
    const messageClient = new ConsoleMessageClient("general");

    const app = express();
    app.use(express.json());

    app.get("/", (req, res) => res.send("Atomist Listener Demon\n"));

    app.post(MessageRoute, (req, res, next) => {
        return messageClient.send(req.body.message, req.body.destinations)
            .then(() => res.send("Read message " + JSON.stringify(req.body) + "\n"))
            .catch(next);
    });

    sdm.commandsMetadata.forEach(hmd => exportHandlerRoute(app, hmd, sdm));
    for (const event of HookEvents) {
        exportGitHookRoute(app, event, sdm);
    }
    app.listen(DemonPort,
        () => infoMessage(`Atomist Slalom: Listening on port ${DemonPort}...\n`),
    );
}

function exportHandlerRoute(e: Express, hmd: CommandHandlerMetadata, sdm: LocalSoftwareDeliveryMachine) {
    e.get(`/command/${hmd.name}`, async (req, res) => {
        const ci: CommandInvocation = {
            name: hmd.name,
            args: Object.getOwnPropertyNames(req.query).map(prop => ({ name: prop, value: req.query[prop] })),
        };
        // TODO redirect output??
        await sdm.executeCommand(ci);
        return res.send(`Executed command '${hmd.name}'`);
    });
}

function exportGitHookRoute(e: Express, event: string, sdm: LocalSoftwareDeliveryMachine) {
    e.get(`/git/${event}`, async (req, res) => {
        const invocation: GitHookInvocation = {
            event,
            baseDir: null,
            branch : null,
            sha: null,
        };
        await handleGitHookEvent(sdm, invocation);
        return res.send(`Executed event '${event}'`);
    });
}
