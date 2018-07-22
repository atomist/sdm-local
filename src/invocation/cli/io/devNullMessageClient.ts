import { Destination, MessageClient, MessageOptions, SlackMessageClient } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";

/**
 * Message client that ignores any messages
 */
export const DevNullMessageClient: (MessageClient & SlackMessageClient) = {

    async addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        return {};
    },
    async addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        return {};

    },
    async respond(msg: any, options?: MessageOptions): Promise<any> {
        return {};
    },
    async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        return {};

    },
};