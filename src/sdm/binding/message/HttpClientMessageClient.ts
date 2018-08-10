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
    Destination,
    isSlackMessage,
    MessageClient,
    MessageOptions,
    SlackDestination,
    SlackMessageClient,
} from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import axios from "axios";
import { AutomationClientConnectionRequest } from "../../../cli/invocation/http/AutomationClientConnectionConfig";
import { StreamedMessage } from "../../../common/ui/httpMessaging";
import { messageListenerEndpoint } from "../../ui/HttpMessageListener";
import { ActionStore } from "./ActionStore";
import { isSdmGoalStoreOrUpdate } from "./GoalEventForwardingMessageClient";

/**
 * Server-side Message client that POSTS to an Atomist client listener (which
 * is itself a server) and logs to a fallback otherwise.
 * There's one distinct HTTP message client for each address.
 */
export class HttpClientMessageClient implements MessageClient, SlackMessageClient {

    private readonly url: string;

    private dead: boolean;

    public async respond(message: any, options?: MessageOptions): Promise<any> {
        return this.addressChannels(message, this.options.channel, options);
    }

    public async send(msg: string | SlackMessage, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        if (isSdmGoalStoreOrUpdate(msg)) {
            // We don't need to do anything about this
            return;
        }
        const dests = Array.isArray(destinations) ? destinations : [destinations];
        return this.stream({
            message: msg,
            machineAddress: this.options.machineAddress,
            options,
            destinations: dests,
        });
    }

    public async addressChannels(message: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        if (isSlackMessage(message)) {
            await this.options.actionStore.storeActions(message);
        }
        return this.stream({
            message,
            options,
            machineAddress: this.options.machineAddress,
            destinations: [{
                team: this.options.workspaceId,
                channels,
            } as SlackDestination],
        });
    }

    public async addressUsers(message: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        return this.addressChannels(message, users, options);
    }

    /**
     * Send the message to the client
     * @param {StreamedMessage} sm
     * @return {Promise<any>}
     */
    private async stream(sm: StreamedMessage) {
        try {
            if (!this.dead) {
                logger.debug(`Write to url ${this.url}: ${JSON.stringify(sm)}`);
                await axios.post(this.url, sm);
                logger.debug(`Wrote to url ${this.url}: ${JSON.stringify(sm)}`);
            }
        } catch (err) {
            if (this.options.transient) {
                // Stop sending messages here. it must have gone away
                this.dead = true;
            }
            logger.info("Cannot POST to log service at [%s]: %s", this.url, err.message);
        }
    }

    constructor(public readonly options: {
        workspaceId: string,
        channel: string,
        port: number,
        transient: boolean,
        machineAddress: AutomationClientConnectionRequest,
        actionStore: ActionStore,
    }) {
        this.url = messageListenerEndpoint(options.port);
    }
}
