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

import { isSdmGoal } from "@atomist/sdm/api-helper/goal/sdmGoal";
import * as TerminalRenderer from "marked-terminal";

marked.setOptions({
    // Define custom renderer
    renderer: new TerminalRenderer(),
});

import chalk from "chalk";
import { invokeEventHandler } from "../../http/EventHandlerInvocation";
import { DefaultConfig } from "../../config";
import { SdmGoalKey, SdmGoalState } from "@atomist/sdm";
import { OnAnyFailedSdmGoal, OnAnyRequestedSdmGoal } from "@atomist/sdm-core/typings/types";
import SdmGoal = OnAnyFailedSdmGoal.SdmGoal;

function isSdmGoalStoreOrUpdate(o: any): o is (SdmGoalKey & {
    state: SdmGoalState;
}) {
    const maybe = o as SdmGoalKey;
    return !!maybe.name && !!maybe.environment;
}

/**
 * Message client logging to the console. Uses color and renders markdown
 */
export class ConsoleMessageClient implements MessageClient, SlackMessageClient {

    public async respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any> {
        logger.info("MessageClient.respond: Raw mesg=\n%j\n", msg);
        return this.addressChannels(msg, this.linkedChannel, options);
    }

    // TODO this should be independent of where it's routed
    public async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        logger.info("MessageClient.send: Raw mesg=\n%j\n", msg);
        if (isSdmGoalStoreOrUpdate(msg)) {
            logger.info("Storing SDM goal or ingester payload %j", msg);
            let handlerNames: string[] = [];
            switch (msg.state) {
                case SdmGoalState.requested:
                    handlerNames = ["OnAnyRequestedSdmGoal"];
                    break;
                case SdmGoalState.failure :
                    handlerNames = ["OnAnyCompletedSdmGoal", "OnAnyFailedSdmGoal"];
                    break;
                case SdmGoalState.success:
                    handlerNames = ["OnAnyCompletedSdmGoal", "OnAnySuccessfulSdmGoal"];
                    break;
            }
            const payload: OnAnyRequestedSdmGoal.Subscription = {
                SdmGoal: [msg],
            };
            // process.stdout.write(JSON.stringify(payload));
            // Don't wait for them
            Promise.all(handlerNames.map(name =>
                invokeEventHandler(DefaultConfig, {
                    name,
                    payload,
                })));
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
            // TODO fix hardcoding
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
    private writeToChannel(channels: string[] | string, markdown: string) {
        process.stdout.write(chalk.gray("#") + marked(` **${channels}** ` + markdown, this.markedOptions));
    }

    constructor(private readonly linkedChannel: string,
                public readonly markedOptions: MarkedOptions = {
                    breaks: false,
                }) {
    }

}
