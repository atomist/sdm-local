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

import { Configuration, HandlerResult, logger, } from "@atomist/automation-client";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import { DefaultAutomationClientConnectionConfig } from "../../cli/entry/resolveConnectionConfig";
import { AllMessagesPort } from "../../cli/invocation/command/addStartListenerCommand";
import { CommandHandlerInvocation, invokeCommandHandler, } from "../../cli/invocation/http/CommandHandlerInvocation";
import { isInLocalMode } from "../api/isInLocalMode";
import { LocalGraphClient } from "../binding/graph/LocalGraphClient";
import { ActionRoute, ActionStore, freshActionStore } from "../binding/message/ActionStore";
import { BroadcastingMessageClient } from "../binding/message/BroadcastingMessageClient";
import { GoalEventForwardingMessageClient } from "../binding/message/GoalEventForwardingMessageClient";
import { HttpClientMessageClient } from "../binding/message/HttpClientMessageClient";
import { SystemNotificationMessageClient } from "../binding/message/SystemNotificationMessageClient";
import { channelFor, portToRespondOn, } from "./correlationId";
import { createSdmOptions } from "./createSdmOptions";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { NotifyOnCompletionAutomationEventListener } from "./support/NotifyOnCompletionAutomationEventListener";
import { AutomationClientConnectionRequest } from "../../cli/invocation/http/AutomationClientConnectionConfig";

/**
 * Configures an automation client in local mode
 * @param {LocalMachineConfig} localMachineConfig
 * @return {(configuration: Configuration) => Promise<Configuration>}
 */
export function configureLocal(
    localMachineConfig: LocalMachineConfig & { forceLocal?: boolean }): (configuration: Configuration) => Promise<Configuration> {
    return async configuration => {

        // Don't mess with a non local sdm.machine
        if (!(localMachineConfig.forceLocal || isInLocalMode())) {
            return configuration;
        }

        logger.info("Disable web socket connection");
        configuration.ws.enabled = false;

        const globalActionStore = freshActionStore();

        configureWebEndpoints(configuration, localMachineConfig, globalActionStore);

        setMessageClient(configuration, localMachineConfig, globalActionStore);
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

function configureWebEndpoints(configuration: Configuration, localMachineConfig: LocalMachineConfig, actionStore: ActionStore) {
    // Disable auth as we're only expecting local clients
    // TODO what if not basic
    _.set(configuration, "http.auth.basic.enabled", false);

    // TODO shouldn't be necessary
    const cc = DefaultAutomationClientConnectionConfig;

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
                    atomistTeamName: cc.atomistTeamName,
                    atomistTeamId: cc.atomistTeamId,
                };
                const r = await invokeCommandHandler(cc, invocation);
                return res.json(r);
            });
            exp.get(ActionRoute + "/:description", async (req, res) => {
                logger.debug("Action clicked:! params=%j; query=%j", req.params, req.query);
                const actionKey = req.query.key;
                if (!actionKey) {
                    logger.error("No action key provided. Please include ?key=< actionKey that has been stored by this sdm >");
                    return res.status(404).send("Required query parameter: key");
                }
                const storedAction = await actionStore.getAction(actionKey);
                if (!storedAction) {
                    logger.error("Action key %s not found", actionKey);
                    return res.status(404).send("Action not stored. Did you restart the SDM?");
                }

                const command = (storedAction as any).command;
                command.atomistTeamName = cc.atomistTeamName;
                command.atomistTeamId = cc.atomistTeamId;
                logger.debug("The parameters are: %j", command.parameters);
                if (!command) {
                    logger.error("No command stored on action object: %j", storedAction);
                    return res.status(500).send("This will never work");
                }
                return invokeCommandHandler(cc, command)
                    .then(r => res.json(decircle(r)),
                        boo => res.status(500).send(boo.message));
            });
        },
    ];
}

function decircle(result: HandlerResult) {
    let noncircular = result;
    try {
        JSON.stringify(noncircular);
    } catch (err) {
        logger.error("Circular object returned from event handler: %s", stringify(result));
        noncircular = { code: result.code, message: stringify(result.message) };
        logger.error("Substituting for circular object: %j", noncircular);
    }
    return noncircular;
}

/**
 * Use custom message client to update HTTP listeners and forward goal events back to the SDM via HTTP
 * @param {Configuration} configuration
 * @param {LocalMachineConfig} localMachineConfig
 */
function setMessageClient(configuration: Configuration, localMachineConfig: LocalMachineConfig, actionStore: ActionStore) {
    configuration.http.messageClientFactory =
        aca => {
            // TOD parameterize this
            const machineAddress: AutomationClientConnectionRequest = { baseEndpoint: "http://localhost:2866" };
            const channel = channelFor(aca.context.correlationId);
            const clientId = portToRespondOn(aca.context.correlationId);
            return new BroadcastingMessageClient(
                new HttpClientMessageClient(channel, AllMessagesPort, machineAddress,
                    actionStore),
                new GoalEventForwardingMessageClient(DefaultAutomationClientConnectionConfig),
                // Communicate back to client if possible
                !!clientId ? new HttpClientMessageClient(channel, clientId, machineAddress, actionStore) : undefined,
                localMachineConfig.useSystemNotifications ? new SystemNotificationMessageClient(channel) : undefined,
            );
        };
}

function setGraphClient(configuration: Configuration) {
    configuration.http.graphClientFactory =
        () => new LocalGraphClient(false);
}
