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

import {
    Destination,
    MessageOptions,
} from "@atomist/automation-client/spi/message/MessageClient";
import { logger } from "@atomist/sdm";
import axios from "axios";
import * as boxen from "boxen";
import { sprintf } from "sprintf-js";
import { AutomationClientConnectionRequest } from "../../cli/invocation/http/AutomationClientConnectionRequest";
import { determineDefaultHostUrl } from "../../sdm/configuration/defaultLocalSoftwareDeliveryMachineConfiguration";

export const MessageRoute = "/message";
export const GoalRoute = "/goal";

export const AllMessagesPort = 6660;

/**
 * Payload data structure used by HTTP message communication
 * (HttpMessageListener/HttpMessageClient)
 */
export interface StreamedMessage {

    message: any;

    destinations: Destination[];

    options: MessageOptions;

    machineAddress: AutomationClientConnectionRequest;
}

/**
 * Write a raw message to the listener
 * @param {string} message
 * @return {Promise<void>}
 */
export async function sendDiagnosticMessageToAllMessagesListener(message: string, ...args: any[]) {
    const url = `http://${determineDefaultHostUrl()}:${AllMessagesPort}/write`;
    const boxed = boxen(sprintf(message, args), { padding: 1 }) + "\n";
    try {
        await axios.post(url, { message: boxed });
    } catch (err) {
        // Ignore any error
    }
}

/**
 * Convenient functino to log in the present process and send a message
 * to the all messages listener, which will be displayed if it's in verbose mode.
 * Typically used when we want to send information about events within the
 * SDM process to a user debugging sdm-local.
 */
export async function logAndSend(msg: string, ...args: any[]) {
    logger.info(msg, args);
    return sendDiagnosticMessageToAllMessagesListener(msg, args);
}
