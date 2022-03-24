/*
 * Copyright © 2019 Atomist, Inc.
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

// this is calling a local address so it's fine
// tslint:disable-next-line:import-blacklist
import axios from "axios";
import { StreamedMessage } from "../../../common/ui/httpMessaging";
import {
    goalListenerEndpoint,
    messageListenerEndpoint,
} from "../../ui/HttpMessageListener";
import { currentMachineAddress } from "../../util/currentMachineAddress";
import { ActionStore } from "./ActionStore";
import { isSdmGoalStoreOrUpdate } from "./GoalEventForwardingMessageClient";
import { MessageClient, SlackMessageClient, MessageOptions, Destination, isSlackMessage, logger, SlackDestination } from "@atomist/sdm/lib/client";

/**
 * Server-side Message client that POSTS to an Atomist client listener (which
 * is itself a server) and logs to a fallback otherwise.
 * There's one distinct HTTP message client for each address.
 */
export class HttpClientMessageClient implements MessageClient, SlackMessageClient {

    private readonly url: string;
    private readonly goalUrl: string;

    private dead: boolean;

    public async respond(message: any, options?: MessageOptions): Promise<any> {
        return this.addressChannels(message, this.options.channel, options);
    }

    public async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        const dests = Array.isArray(destinations) ? destinations : [destinations];
        if (isSdmGoalStoreOrUpdate(msg) || (msg.goals && msg.push && msg.goalSetId)) {
            return this.stream({
                message: msg,
                options,
                machineAddress: currentMachineAddress(),
                destinations: dests,
            }, this.goalUrl);
        }
        return this.sendInternal(msg, dests, options);
    }

    public async addressChannels(message: any, channels: string | string[], options?: MessageOptions): Promise<any> {
        if (isSlackMessage(message)) {
            logger.info("Storing any actions for message %j", message);
            await this.options.actionStore.storeActions(message);
        }
        const destinations: SlackDestination[] = [{
            team: this.options.workspaceId,
            channels: Array.isArray(channels) ? channels : [channels],
            userAgent: undefined,
            users: undefined,
            addressUser: undefined,
            addressChannel: undefined,
        }];
        return this.sendInternal(message, destinations, options);
    }

    public async addressUsers(message: any, users: string | string[], options?: MessageOptions): Promise<any> {
        return this.addressChannels(message, users, options);
    }

    /**
     * Send the message, storing if necessary. Called by other methods.
     */
    private async sendInternal(message: any, destinations: Destination[], options?: MessageOptions): Promise<any> {
        if (isSlackMessage(message)) {
            await this.options.actionStore.storeActions(message);
        }
        return this.stream({
            message,
            options,
            machineAddress: currentMachineAddress(),
            destinations,
        }, this.url);
    }

    /**
     * Send the message to the client
     * @param {StreamedMessage} sm
     * @return {Promise<any>}
     */
    private async stream(sm: StreamedMessage, url: string): Promise<void> {
        try {
            if (!this.dead) {
                logger.log("silly", `Write to url ${url}: ${JSON.stringify(sm)}`);
                await axios.post(url, sm);
                logger.log("silly", `Wrote to url ${url}: ${JSON.stringify(sm)}`);
            }
        } catch (err) {
            if (this.options.transient) {
                // Stop sending messages here. it must have gone away
                this.dead = true;
            }
            logger.log("silly", "Cannot POST to log service at [%s]: %s", this.url, err.message);
        }
    }

    constructor(public readonly options: {
        workspaceId: string,
        channel: string,
        port: number,
        transient: boolean,
        actionStore: ActionStore,
    }) {
        this.url = messageListenerEndpoint(options.port);
        this.goalUrl = goalListenerEndpoint(options.port);
    }
}
