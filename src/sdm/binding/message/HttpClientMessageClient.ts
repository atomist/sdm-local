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
import {
    Destination, isSlackMessage,
    MessageClient,
    MessageOptions,
    SlackDestination,
    SlackMessageClient,
} from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import axios from "axios";
import { ActionStore } from "./ActionStore";
import { DevNullMessageClient } from "./devNullMessageClient";
import { isSdmGoalStoreOrUpdate } from "./GoalEventForwardingMessageClient";
import {
    messageListenerEndpoint,
    StreamedMessage,
} from "./httpMessageListener";

/**
 * Message client that POSTS to an Atomist server and logs to a fallback otherwise
 */
export class HttpClientMessageClient implements MessageClient, SlackMessageClient {

    public async respond(message: any, options?: MessageOptions): Promise<any> {
        return this.addressChannels(message, this.linkedChannel, options);
    }

    public async send(msg: string | SlackMessage, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        if (isSdmGoalStoreOrUpdate(msg)) {
            // We don't need to do anything about this
            return;
        }
        const dests = Array.isArray(destinations) ? destinations : [destinations];
        return this.stream({ message: msg, options, destinations: dests },
            () => this.delegate.send(msg, destinations, options));
    }

    public async addressChannels(message: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        if (isSlackMessage(message)) {
            await this.actionStore.storeActions(message);
        } else {
            logger.info("Not a slack message: %j", message);
        }
        return this.stream({
            message,
            options,
            destinations: [{
                // TODO hard coding
                team: "T1234",
                channels,
            } as SlackDestination],
        }, () => this.delegate.addressChannels(message, channels, options));
    }

    public async addressUsers(message: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        return this.addressChannels(message, users, options);
    }

    private async stream(sm: StreamedMessage, fallback: () => Promise<any>) {
        try {
            logger.debug(`Write to url ${this.url}: ${JSON.stringify(sm)}`);
            await axios.post(this.url, sm);
            logger.info(`Wrote to url ${this.url}: ${JSON.stringify(sm)}`);
        } catch (err) {
            logger.info("Cannot POST to log service at [%s]: %s", this.url, err.message);
            return fallback();
        }
    }

    private readonly url: string;

    constructor(private readonly linkedChannel: string,
                port: number,
                private readonly actionStore: ActionStore,
                private readonly delegate: MessageClient & SlackMessageClient =
                    DevNullMessageClient) {
        this.url = messageListenerEndpoint(port);
    }
}
