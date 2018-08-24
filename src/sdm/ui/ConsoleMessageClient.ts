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

import { logger } from "@atomist/automation-client";
import { toStringArray } from "@atomist/automation-client/internal/util/string";
import {
    Destination,
    isSlackMessage,
    MessageClient,
    MessageOptions,
    SlackDestination,
    SlackMessageClient,
} from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import * as slack from "@atomist/slack-messages/SlackMessages";
import chalk from "chalk";
import * as formatDate from "format-date";
import * as _ from "lodash";
import * as marked from "marked";
import { MarkedOptions } from "marked";
import * as TerminalRenderer from "marked-terminal";
import { AutomationClientConnectionRequest } from "../../cli/invocation/http/AutomationClientConnectionRequest";
import {
    actionDescription,
    actionKeyFor,
    ActionRoute,
} from "../binding/message/ActionStore";
import { isSdmGoalStoreOrUpdate } from "../binding/message/GoalEventForwardingMessageClient";

marked.setOptions({
    // Define custom renderer
    renderer: new TerminalRenderer(),
});

/**
 * Function used to send output. Useful for testing. Default implementation
 * writes to stdout.
 */
export type Sender = (msg: string) => Promise<any>;

/**
 * Sender that writes to console using process.stdout.
 * This works even if console out is rerouted to logging.
 * @param msg message
 */
export const ProcessStdoutSender: Sender = msg => Promise.resolve(process.stdout.write(msg));

/**
 * Message client logging to the console. Uses color and renders markdown
 */
export class ConsoleMessageClient implements MessageClient, SlackMessageClient {

    public async respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any> {
        logger.debug("MessageClient.respond: Raw mesg=\n%j\n", msg);
        return this.addressChannels(msg, this.linkedChannel, options);
    }

    public async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        if (isSdmGoalStoreOrUpdate(msg)) {
            return;
        }
        const dests: SlackDestination[] =
            (Array.isArray(destinations) ? destinations : [destinations] as any)
                .filter((a: any) => a.userAgent !== "ingester");
        return this.addressChannels(
            msg,
            _.flatten(dests.map(d => d.channels)),
            options);
    }

    public async addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        logger.debug("MessageClient.addressChannels: Raw mesg=\n%j\nChannels=%s\n", msg, channels);
        const chans = toStringArray(channels);
        chans.forEach(async channel => {
            // TODO isSlackMessage doesn't return right
            if (isSlackMessage(msg)) {
                if (!!msg.text) {
                    await this.writeToChannel(channel, msg.text);
                }
                (msg.attachments || []).forEach(async att => {
                    if (!!att.text) {
                        await this.writeToChannel(channel, att.text);
                    }
                    (att.actions || []).forEach(async (action, index) => {
                        await this.renderAction(channel, action, actionKeyFor(msg, index));
                    });
                });
            } else if (typeof msg === "string") {
                await this.writeToChannel(channel, msg);
            } else {
                const m = msg as any;
                if (!!m.content) {
                    await this.writeToChannel(channel, m.content);
                } else {
                    await this.writeToChannel(channel, "???? What is " + JSON.stringify(msg));
                }
            }
        });
    }

    public async addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        logger.debug("MessageClient.addressUsers: Raw mesg=\n%j\nUsers=%s", msg, users);
        return this.sender(`#${users} ${this.dateString()} ${msg}\n`);
    }

    private async renderAction(channel: string,
                               action: slack.Action,
                               actionKey: string) {
        if (action.type === "button") {
            const url = `${this.connectionConfig.baseEndpoint}${ActionRoute}/${actionDescription(action)}?key=${actionKey}`;
            await this.writeToChannel(channel, `${action.text} - ${url}`);
        } else {
            return this.sender(JSON.stringify(action) + "\n");
        }
    }

    /**
     * Apply consistent formatting to mimic writing to a Slack channel
     * @param {string[] | string} channels
     * @param {string} markdown
     */
    private writeToChannel(channels: string[] | string, markdown: string) {
        const outputText = ` ${marked(`**${channels}**`, this.markedOptions).trim()} ${this.dateString()} ${
            marked(markdown, this.markedOptions).trim()}`;
        return this.sender(chalk.gray("#") + outputText + "\n");
    }

    public dateString() {
        return chalk.dim(formatDate("{year}-{month}-{day} {hours}:{minutes}:{seconds}", new Date()));
    }

    /**
     * Construct a new ConsoleMessageClient, supporting actionable messages.
     * @param {string} linkedChannel
     * @param {Sender} sender
     * @param {AutomationClientConnectionRequest} connectionConfig config to use to
     * format URLs to call back the source SDM
     * @param {marked.MarkedOptions} markedOptions
     */
    constructor(private readonly linkedChannel: string,
                private readonly sender: Sender,
                private readonly connectionConfig: AutomationClientConnectionRequest,
                public readonly markedOptions: MarkedOptions = {
            breaks: false,
        }) {
    }

}
