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
    automationClientInstance,
    Configuration,
    HandlerResult,
    logger,
} from "@atomist/automation-client";
import { guid } from "@atomist/automation-client/internal/util/string";
import {
    isInLocalMode,
    LocalModeConfiguration,
} from "@atomist/sdm-core";
import * as assert from "assert";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import { AutomationClientConnectionRequest } from "../../cli/invocation/http/AutomationClientConnectionRequest";
import { EnvConfigWorkspaceContextResolver } from "../../common/binding/EnvConfigWorkspaceContextResolver";
import { defaultLocalLocalModeConfiguration } from "../../common/configuration/defaultLocalModeConfiguration";
import { CommandHandlerInvocation } from "../../common/invocation/CommandHandlerInvocation";
import { LocalWorkspaceContext } from "../../common/invocation/LocalWorkspaceContext";
import {
    parseChannel,
    parsePort,
} from "../../common/invocation/parseCorrelationId";
import { AllMessagesPort } from "../../common/ui/httpMessaging";
import { defaultHostUrlAliaser } from "../../common/util/http/defaultLocalHostUrlAliaser";
import { LocalGraphClient } from "../binding/graph/LocalGraphClient";
import {
    ActionRoute,
    ActionStore,
    freshActionStore,
} from "../binding/message/ActionStore";
import { BroadcastingMessageClient } from "../binding/message/BroadcastingMessageClient";
import { GoalEventForwardingMessageClient } from "../binding/message/GoalEventForwardingMessageClient";
import { HttpClientMessageClient } from "../binding/message/HttpClientMessageClient";
import { SystemNotificationMessageClient } from "../binding/message/SystemNotificationMessageClient";
import { invokeCommandHandlerInProcess } from "../invocation/invokeCommandHandlerInProcess";
import { renderCommandHandlerForm } from "../invocation/renderCommandHandlerFromForm";
import { createSdmOptions } from "./createSdmOptions";
import { NotifyOnCompletionAutomationEventListener } from "./support/NotifyOnCompletionAutomationEventListener";
import { newCliCorrelationId } from "../../cli/invocation/http/support/newCorrelationId";

/**
 * Configures an automation client in local mode
 * @param {LocalModeConfiguration} localModeConfiguration
 * @return {(configuration: Configuration) => Promise<Configuration>}
 */
export function configureLocal(
    localModeConf: LocalModeConfiguration & { forceLocal?: boolean }): (configuration: Configuration) => Promise<Configuration> {
    return async configuration => {

        const workspaceContext: LocalWorkspaceContext = new EnvConfigWorkspaceContextResolver().workspaceContext;

        // Don't mess with a non local SDM
        if (!(localModeConf.forceLocal || isInLocalMode())) {
            return configuration;
        }

        // Get sensible defaults
        const localModeConfiguration = {
            ...defaultLocalLocalModeConfiguration(),
            ...localModeConf,
        };

        // Set up workspaceIds and apiKey
        if (_.isEmpty(configuration.workspaceIds) && _.isEmpty(configuration.teamIds)) {
            configuration.workspaceIds = [workspaceContext.workspaceId];
        }
        if (_.isEmpty(configuration.apiKey)) {
            configuration.apiKey = guid();
        }

        logger.info("Disable web socket connection");
        configuration.ws.enabled = false;

        const globalActionStore = freshActionStore();

        configureWebEndpoints(configuration, localModeConfiguration, workspaceContext, globalActionStore);

        setMessageClient(configuration, localModeConfiguration, workspaceContext, globalActionStore);
        setGraphClient(configuration);

        addListeners(configuration);

        const localModeSdmConfigurationElements = createSdmOptions(localModeConfiguration);

        // Need extra config to know how to set things in the SDM
        configuration.sdm = {
            ...configuration.sdm,
            ...localModeSdmConfigurationElements,
        };
        return configuration;
    };
}

function configureWebEndpoints(configuration: Configuration, localModeConfiguration: LocalModeConfiguration,
                               teamContext: LocalWorkspaceContext,
                               actionStore: ActionStore) {
    // Disable auth as we're only expecting local clients
    // TODO what if not basic
    _.set(configuration, "http.auth.basic.enabled", false);

    configuration.http.customizers = [
        exp => {
            // TODO could use this to set local mode for a server - e.g. the name to send to
            exp.get("/local/configuration", async (req, res) => {
                res.json(localModeConfiguration);
            });
            const bodyParser = require("body-parser");
            exp.use(bodyParser.urlencoded({ extended: false }));
            exp.use(bodyParser.json());
            // Add a GET route for convenient links to command handler invocation, as a normal automation client doesn't expose one
            exp.get("/command/:name", async (req, res) => {
                const payload = req.query;
                const command = automationClientInstance().automations.automations.commands.find(c => c.name === req.params.name);
                if (!command) {
                    return res.status(404).send(`Command '${req.params.name}' not found`);
                }
                return res.status(200).send(renderCommandHandlerForm(payload, command));
            });
            exp.post("/command/:name", async (req, res) => {
                const payload = req.body;
                const invocation: CommandHandlerInvocation = {
                    name: req.params.name,
                    parameters: payload,
                    mappedParameters: [],
                    workspaceName: teamContext.workspaceName,
                    workspaceId: teamContext.workspaceId,
                };
                const r = await invokeCommandHandlerInProcess()(invocation)
                    .then(resp => res.json(decircle(resp)),
                        boo => res.status(500).send(boo.message));
                return res.json(r);
            });
            exp.get(ActionRoute + "/:description", async (req, res) => {
                logger.debug("Action clicked: params=%j; query=%j", req.params, req.query);
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
                command.workspaceName = teamContext.workspaceName;
                command.workspaceId = teamContext.workspaceName;
                command.correlationId = await newCliCorrelationId();
                logger.debug("The parameters are: %j", command.parameters);
                if (!command) {
                    logger.error("No command stored on action object: %j", storedAction);
                    return res.status(500).send("This will never work");
                }
                return invokeCommandHandlerInProcess()(command)
                    .then(r => res.json(decircle(r)),
                        boo => {
                            logger.error("Failed to serve request %s: %s", req.url, boo.stack)
                            res.status(500).send(boo.message)
                        });
            });
        },
    ];
}

function addListeners(configuration: Configuration) {
    if (!configuration.listeners) {
        configuration.listeners = [];
    }
    configuration.listeners.push(new NotifyOnCompletionAutomationEventListener());
}

// TODO this looks out of place here
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
 * @param {LocalModeConfiguration} localMachineConfig
 */
function setMessageClient(configuration: Configuration,
                          localMachineConfig: LocalModeConfiguration,
                          teamContext: LocalWorkspaceContext,
                          actionStore: ActionStore) {
    configuration.http.messageClientFactory =
        aca => {
            // TOD parameterize this - can use multicast
            const machineAddress: AutomationClientConnectionRequest = {
                baseEndpoint: `http://${defaultHostUrlAliaser().alias()}:2866`,
            };

            assert(!!aca.context.correlationId);
            const channel = parseChannel(aca.context.correlationId);
            const port = parsePort(aca.context.correlationId);
            return new BroadcastingMessageClient(
                new HttpClientMessageClient({
                    workspaceId: teamContext.workspaceId,
                    channel,
                    port: AllMessagesPort,
                    machineAddress,
                    actionStore,
                    transient: false,
                }),
                new GoalEventForwardingMessageClient(),
                // Communicate back to client if possible
                !!port ? new HttpClientMessageClient({
                    workspaceId: teamContext.workspaceId,
                    channel, port,
                    machineAddress,
                    actionStore,
                    transient: true,
                }) : undefined,
                localMachineConfig.useSystemNotifications ? new SystemNotificationMessageClient(channel) : undefined,
            );
        };
}

function setGraphClient(configuration: Configuration) {
    configuration.http.graphClientFactory =
        () => new LocalGraphClient(false);
}
