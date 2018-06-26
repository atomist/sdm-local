import {
    Destination,
    isSlackMessage,
    MessageClient,
    MessageOptions,
    SlackDestination,
    SlackMessageClient,
} from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";

import { logger } from "@atomist/automation-client";
import { toStringArray } from "@atomist/automation-client/internal/util/string";
import * as _ from "lodash";
import * as marked from "marked";
import { MarkedOptions } from "marked";

import * as slack from "@atomist/slack-messages/SlackMessages";

import * as TerminalRenderer from "marked-terminal";
import { isSdmGoal } from "@atomist/sdm/api-helper/goal/sdmGoal";

marked.setOptions({
    // Define custom renderer
    renderer: new TerminalRenderer(),
});

// tslint:disable-next-line:no-var-requires
const chalk = require("chalk");

/**
 * Message client logging to the console. Uses color and renders markdown
 */
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
            (Array.isArray(destinations) ? destinations : [destinations] as any)
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
                    process.stdout.write(chalk.gray("#") + marked(` **${channel}** ` + msg, this.markedOptions));
                }
                msg.attachments.forEach(att => {
                    process.stdout.write(chalk.gray("#") + marked(` **${channel}** ` + att.text, this.markedOptions));
                    att.actions.forEach(action => {
                        this.renderAction(channel, action);
                    });
                });
            } else {
                process.stdout.write(chalk.gray("#") + marked(` **${channel}** ` + msg, this.markedOptions));
            }
        });
    }

    public async addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        process.stdout.write(`#${users} ${msg}\n`);
    }

    private renderAction(channel: string, action: slack.Action) {
        if (action.type === "button") {
            // TODO fix hardcoding
            const a = action as any;
            let url = `http://localhost:6660/command/${a.command.name}?`;
            Object.getOwnPropertyNames(a.command.parameters).forEach(prop => {
                url += `${prop}=${a.command.parameters[prop]}`;
            });
            process.stdout.write(chalk.green("#") + marked(` **${channel}** ${action.text} - ${url}`, this.markedOptions));
        } else {
            process.stdout.write(JSON.stringify(action) + "\n");
        }
    }

    constructor(public readonly markedOptions: MarkedOptions = {
        breaks: false,
    }) {
    }

}
