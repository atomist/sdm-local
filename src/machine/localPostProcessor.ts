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
    Configuration,
    logger,
} from "@atomist/automation-client";
import * as _ from "lodash";
import { LocalGraphClient } from "../sdm/binding/graph/LocalGraphClient";
import { BroadcastingMessageClient } from "../sdm/binding/message/BroadcastingMessageClient";
import { GoalEventForwardingMessageClient } from "../sdm/binding/message/GoalEventForwardingMessageClient";
import { HttpClientMessageClient } from "../sdm/binding/message/HttpClientMessageClient";
import { SystemNotificationMessageClient } from "../sdm/binding/message/SystemNotificationMessageClient";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
import { AllMessagesPort } from "../invocation/cli/command/addStartListenerCommand";
import {
    CommandHandlerInvocation,
    invokeCommandHandler,
} from "../invocation/http/CommandHandlerInvocation";
import {
    channelFor,
    clientIdentifier,
} from "./correlationId";
import { createSdmOptions } from "./createSdmOptions";
import { isInLocalMode } from "./isInLocalMode";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { NotifyOnCompletionAutomationEventListener } from "./support/NotifyOnCompletionAutomationEventListener";

/**
 * Configures an automation client in local mode
 * @param {LocalMachineConfig} localMachineConfig
 * @param forceLocal whether to force local behavior
 * @return {(configuration: Configuration) => Promise<Configuration>}
 */
export function configureLocal(
    localMachineConfig: LocalMachineConfig & { forceLocal?: boolean }): (configuration: Configuration) => Promise<Configuration> {
    return async configuration => {

        // Don't mess with a non local machine
        if (!(localMachineConfig.forceLocal || isInLocalMode())) {
            return configuration;
        }

        logger.info("Disable web socket connection");
        configuration.ws.enabled = false;

        configureWebEndpoints(configuration, localMachineConfig);

        setMessageClient(configuration, localMachineConfig);
        setGraphClient(configuration);

        if (!configuration.listeners) {
            configuration.listeners = [];
        }
        configuration.listeners.push(new NotifyOnCompletionAutomationEventListener());

        const localModeSdmConfigurationElements = createSdmOptions(localMachineConfig);

        // Need extra config to know how to set things in the SDM
        configuration.sdm = {
            ...configuration.sdm,
            ...localModeSdmConfigurationElements,
        };
        return configuration;
    };
}

function configureWebEndpoints(configuration: Configuration, localMachineConfig: LocalMachineConfig) {
    // Disable auth as we're only expecting local clients
    // TODO what if not basic
    _.set(configuration, "http.auth.basic.enabled", false);

    configuration.http.customizers = [
        exp => {
            // TODO could use this to set local mode for a server - e.g. the name to send to
            exp.get("/local/configuration", async (req, res) => {
                res.json(localMachineConfig);
            });
            // Add a GET route for convenient links to command handler invocation, as a normal automation client doesn't expose one
            exp.get("/command/:name", async (req, res) => {
                // TODO this should really forward to a page exposing the parameters, which populates from the query
                const payload = req.query;
                const invocation: CommandHandlerInvocation = {
                    name: req.params.name,
                    parameters: payload,
                    mappedParameters: [],
                };
                // TODO parameterize this path
                const r = await invokeCommandHandler(DefaultAutomationClientConnectionConfig, invocation);
                return res.json(r);
            });
        },
    ];
}

/**
 * Use custom message client to update HTTP listeners and forward goal events back to the SDM via HTTP
 * @param {Configuration} configuration
 * @param {LocalMachineConfig} localMachineConfig
 */
function setMessageClient(configuration: Configuration, localMachineConfig: LocalMachineConfig) {
    configuration.http.messageClientFactory =
        aca => {
            const channel = channelFor(aca.context.correlationId);
            const clientId = clientIdentifier(aca.context.correlationId);
            return new BroadcastingMessageClient(
                new HttpClientMessageClient(channel, AllMessagesPort),
                new GoalEventForwardingMessageClient(DefaultAutomationClientConnectionConfig),
                // Communicate back to client if possible
                !!clientId ? new HttpClientMessageClient(channel, clientId) : undefined,
                localMachineConfig.useSystemNotifications ? new SystemNotificationMessageClient(channel) : undefined,
            );
        };
}

function setGraphClient(configuration: Configuration) {
    configuration.http.graphClientFactory =
        () => new LocalGraphClient(false);
}
