import { Destination, isSlackMessage, MessageOptions, SlackDestination } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";

import { logger } from "@atomist/automation-client";
import { toStringArray } from "@atomist/automation-client/internal/util/string";
import * as _ from "lodash";
import * as marked from "marked";
import { MarkedOptions } from "marked";

import * as slack from "@atomist/slack-messages/SlackMessages";
import * as TerminalRenderer from "marked-terminal";
import { AbstractGoalEventForwardingMessageClient } from "./AbstractGoalEventForwardingMessageClient";

// import { notifier } from "node-notifier";

const notifier = require("node-notifier");

marked.setOptions({
    // Define custom renderer
    renderer: new TerminalRenderer(),
});

/**
 * Message client logging to the console. Uses color and renders markdown
 */
export class SystemNotificationMessageClient extends AbstractGoalEventForwardingMessageClient {

    public async respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any> {
        logger.info("MessageClient.respond: Raw mesg=\n%j\n", msg);
        return this.addressChannels(msg, this.linkedChannel, options);
    }

    public async sendInternal(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        const dests: SlackDestination[] =
            (Array.isArray(destinations) ? destinations : [destinations] as any)
                .filter(a => a.userAgent !== "ingester");
        return this.addressChannels(
            msg,
            _.flatten(dests.map(d => d.channels)),
            options);
    }

    public async addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        logger.info("MessageClient.addressChannels: Raw mesg=\n%j\nChannels=%s\n", msg, channels);
        const chans = toStringArray(channels);
        chans.forEach(channel => {
            // TODO isSlackMessage doesn't return right
            if (isSlackMessage(msg)) {
                if (!!msg.text) {
                    this.writeToChannel(channel, msg.text);
                }
                msg.attachments.forEach(att => {
                    this.writeToChannel(channel, att.text);
                    att.actions.forEach(action => {
                        this.renderAction(channel, action);
                    });
                });
            } else if (typeof msg === "string") {
                this.writeToChannel(channel, msg);
            } else {
                const m = msg as any;
                if (!!m.content) {
                    this.writeToChannel(channel, m.content);
                } else {
                    this.writeToChannel(channel, "???? What is " + JSON.stringify(msg));
                }
            }
        });
    }

    public async addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        logger.info("MessageClient.addressUsers: Raw mesg=\n%j\nUsers=%s", msg, users);
        process.stdout.write(`#${users} ${msg}\n`);
    }

    private renderAction(channel: string, action: slack.Action) {
        if (action.type === "button") {
            // TODO fix hardcoding (use config), and need to update to call local client
            const a = action as any;
            let url = `http://localhost:6660/command/${a.command.name}?`;
            Object.getOwnPropertyNames(a.command.parameters).forEach(prop => {
                url += `${prop}=${a.command.parameters[prop]}`;
            });
            this.writeToChannel(channel, `${action.text} - ${url}`);
        } else {
            process.stdout.write(JSON.stringify(action) + "\n");
        }
    }

    /**
     * Apply consistent formatting to mimic writing to a Slack channel
     * @param {string[] | string} channels
     * @param {string} markdown
     */
    private async writeToChannel(channels: string[] | string, markdown: string) {
        return notifier.notify({
            title: `Atomist: [${channels}]`,
            message: markdown,
        });
    }

    constructor(private readonly linkedChannel: string,
                public readonly markedOptions: MarkedOptions = {
                    breaks: false,
                }) {
        super();
    }

}
