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

import { Destination, MessageOptions } from "@atomist/automation-client/spi/message/MessageClient";
import { SlackMessage } from "@atomist/slack-messages";
import { AutomationClientConnectionRequest } from "../../cli/invocation/http/AutomationClientConnectionConfig";

export const MessageRoute = "/message";

/**
 * Payload data structure used by HTTP message communication
 * (HttpMessageListener/HttpMessageClient)
 */
export interface StreamedMessage {

    message: string | SlackMessage;

    destinations: Destination[];

    options: MessageOptions;

    machineAddress: AutomationClientConnectionRequest;
}
