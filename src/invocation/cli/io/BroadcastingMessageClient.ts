import { Destination, MessageClient, MessageOptions, SlackMessageClient } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";

/**
 * MessageClient implementation that delegates to many message clients
 */
export class BroadcastingMessageClient implements MessageClient, SlackMessageClient {

    private readonly delegates: Array<MessageClient & SlackMessageClient>;

    public addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        return Promise.all(this.delegates.map(d => d.addressChannels(msg, channels, options)));
    }

    public addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        return Promise.all(this.delegates.map(d => d.addressUsers(msg, users, options)));
    }

    public respond(msg: any, options?: MessageOptions): Promise<any> {
        return Promise.all(this.delegates.map(d => d.respond(msg, options)));
    }

    public send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        return Promise.all(this.delegates.map(d => d.send(msg, destinations, options)));
    }

    constructor(...delegates: Array<MessageClient & SlackMessageClient>) {
        this.delegates = delegates;
    }

}
