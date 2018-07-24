import { Destination, MessageClient, MessageOptions, SlackMessageClient } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import { logger } from "@atomist/automation-client";

/**
 * MessageClient implementation that delegates to many message clients
 */
export class BroadcastingMessageClient implements MessageClient, SlackMessageClient {

    private readonly delegates: Array<MessageClient & SlackMessageClient>;

    public addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        logger.info("Broadcast.addressChannels: %j", msg);
        return Promise.all(
            this.delegates.map(d => {
                try {
                    return d.addressChannels(msg, channels, options);
                } catch {
                    // Ignore and continue
                }
            }));
    }

    public addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        logger.info("Broadcast.addressUsers: %j", msg);
        return Promise.all(
            this.delegates.map(d => {
                try {
                    return d.addressUsers(msg, users, options);
                } catch {
                    // Ignore and continue
                }
            }));
    }

    public respond(msg: any, options?: MessageOptions): Promise<any> {
        logger.info("Broadcast.respond: %j", msg);
        return Promise.all(
            this.delegates.map(d => {
                try {
                    return d.respond(msg, options);
                } catch {
                    // Ignore and continue
                }
            }));
    }

    public send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        logger.info("Broadcast.send: %j", msg);
        return Promise.all(
            this.delegates.map(d => {
                try {
                    return d.send(msg, destinations, options);
                } catch {
                    // Ignore and continue
                }
            }));
    }

    constructor(...delegates: Array<MessageClient & SlackMessageClient>) {
        process.stdout.write("!!!! new message client");
        this.delegates = delegates;
    }

}
