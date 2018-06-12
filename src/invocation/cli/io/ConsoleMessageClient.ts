import {
    Destination, isSlackMessage,
    MessageClient,
    MessageOptions,
    SlackDestination,
    SlackMessageClient,
} from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import { isArray } from "util";
import { writeToConsole } from "../support/consoleOutput";

import { logger } from "@atomist/automation-client";
import { toStringArray } from "@atomist/automation-client/internal/util/string";
import { isSdmGoal } from "@atomist/sdm/ingesters/sdmGoalIngester";
import * as _ from "lodash";
import * as marked from "marked";

import * as slack from "@atomist/slack-messages/SlackMessages";


import * as TerminalRenderer from "marked-terminal";
import { CommandInvocation } from "@atomist/automation-client/internal/invoker/Payload";

marked.setOptions({
    // Define custom renderer
    renderer: new TerminalRenderer(),
});

// tslint:disable-next-line:no-var-requires
const chalk = require("chalk");

export class ConsoleMessageClient implements MessageClient, SlackMessageClient {

    public async respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any> {
        return this.addressChannels(msg, "general", options);
    }

    public async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        if (isSdmGoal(msg)) {
            logger.info("Storing SDM goal or ingester payload %j", msg);
            return;
        }

        const dests: SlackDestination[] =
            (isArray(destinations) ? destinations : [destinations] as any)
                .filter(a => a.userAgent !== "ingester");
        return this.addressChannels(
            msg,
            _.flatten(dests.map(d => d.channels)),
            options);
    }

    public async addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        const chans = toStringArray(channels);
        chans.forEach(channel => {
            if (isSlackMessage(msg)) {
                if (!!msg.text) {
                    writeToConsole(chalk.green("#") + marked(` **${channel}** ` + msg));
                }
                msg.attachments.forEach(att => {
                    writeToConsole(chalk.green("#") + marked(` **${channel}** ` + att.text));
                    att.actions.forEach(action => {
                        this.renderAction(channel, action);
                    });
                });
            } else {
                writeToConsole(chalk.green("#") + marked(` **${channel}** ` + msg));
            }
        });
    }

    public async addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        writeToConsole(`#${users} ${msg}`);
    }

    private renderAction(channel: string, action: slack.Action) {
        if (action.type === "button") {
            // TODO fix hardcoding
            const a = action as any;
            let url = `http://localhost:6660/command/${a.command.name}?`;
            Object.getOwnPropertyNames(a.command.parameters).forEach(prop => {
                url += `${prop}=${a.command.parameters[prop]}`;
            });
            writeToConsole(chalk.green("#") + marked(` **${channel}** ${action.text} - ${url}`));
        } else {
            writeToConsole(JSON.stringify(action));
        }
    }

}
