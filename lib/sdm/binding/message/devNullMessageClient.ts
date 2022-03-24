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

import { SlackMessage } from "@atomist/slack-messages";
import { MessageClient, SlackMessageClient, MessageOptions, Destination } from "@atomist/sdm/lib/client";

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
