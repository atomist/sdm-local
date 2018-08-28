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
import { eventStore } from "@atomist/automation-client/globals";
import { guid } from "@atomist/automation-client/internal/util/string";
import {
    isInLocalMode,
    LocalSoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm-core";
import * as assert from "assert";
import * as exphbs from "express-handlebars";
import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import * as path from "path";
import { newCliCorrelationId } from "../../cli/invocation/http/support/newCorrelationId";
import { EnvConfigWorkspaceContextResolver } from "../../common/binding/EnvConfigWorkspaceContextResolver";
import { CommandHandlerInvocation } from "../../common/invocation/CommandHandlerInvocation";
import { EventHandlerInvocation } from "../../common/invocation/EventHandlerInvocation";
import { LocalWorkspaceContext } from "../../common/invocation/LocalWorkspaceContext";
import {
    parseChannel,
    parsePort,
} from "../../common/invocation/parseCorrelationId";
import { AllMessagesPort } from "../../common/ui/httpMessaging";
import { LocalGraphClient } from "../binding/graph/LocalGraphClient";
import {
    ActionRoute,
    ActionStore,
    freshActionStore,
} from "../binding/message/ActionStore";
import { BroadcastingMessageClient } from "../binding/message/BroadcastingMessageClient";
import { GoalEventForwardingMessageClient } from "../binding/message/GoalEventForwardingMessageClient";
import { HttpClientMessageClient } from "../binding/message/HttpClientMessageClient";
import { invokeCommandHandlerInProcess } from "../invocation/invokeCommandHandlerInProcess";
import { invokeEventHandlerInProcess } from "../invocation/invokeEventHandlerInProcess";
import { defaultLocalSoftwareDeliveryMachineConfiguration } from "./defaultLocalSoftwareDeliveryMachineConfiguration";
import { NotifyOnCompletionAutomationEventListener } from "./support/NotifyOnCompletionAutomationEventListener";

/**
 * Configures an automation client in local mode
 * @param {LocalModeConfiguration} localModeConfiguration
 * @return {(configuration: Configuration) => Promise<Configuration>}
 */
export function configureLocal(options?: { forceLocal?: boolean }): (configuration: Configuration) => Promise<Configuration> {
    return async config => {

        // Don't mess with a non local SDM
        if (!(options.forceLocal || isInLocalMode())) {
            return config;
        }

        const workspaceContext: LocalWorkspaceContext = new EnvConfigWorkspaceContextResolver().workspaceContext;

        const defaultSdmConfiguration = defaultLocalSoftwareDeliveryMachineConfiguration(workspaceContext);
        const mergedConfig = _.merge(defaultSdmConfiguration, config) as LocalSoftwareDeliveryMachineConfiguration;

        // Set up workspaceIds and apiKey
        if (_.isEmpty(mergedConfig.workspaceIds) && _.isEmpty(mergedConfig.teamIds)) {
            mergedConfig.workspaceIds = [workspaceContext.workspaceId];
        }
        if (_.isEmpty(config.apiKey)) {
            mergedConfig.apiKey = guid();
        }

        mergedConfig.ws.enabled = false;

        const globalActionStore = freshActionStore();

        configureWebEndpoints(mergedConfig, workspaceContext, globalActionStore);
        configureMessageClientFactory(mergedConfig, workspaceContext, globalActionStore);
        configureGraphClient(mergedConfig);
        configureListeners(mergedConfig);

        return mergedConfig;
    };
}

function configureWebEndpoints(configuration: LocalSoftwareDeliveryMachineConfiguration,
                               teamContext: LocalWorkspaceContext,
                               actionStore: ActionStore) {
    // Disable auth as we're only expecting local clients
    // TODO what if not basic
    _.set(configuration, "http.auth.basic.enabled", false);

    process.env.ATOMIST_WEBHOOK_BASEURL = `http://${configuration.local.hostname}:${configuration.http.port}`;

    configuration.http.customizers = [
        exp => {
            // TODO could use this to set local mode for a server - e.g. the name to send to
            exp.get("/local/configuration", async (req, res) => {
                res.json(configuration.localSdm);
            });

            const bodyParser = require("body-parser");
            exp.use(bodyParser.urlencoded({ extended: false }));
            exp.use(bodyParser.json());

            // Handlebars setup
            exp.set("view engine", "handlebars");
            exp.set("views", path.join(__dirname, "..", "..", "views"));
            exp.engine("handlebars", exphbs({
                defaultLayout: "main",
                layoutsDir: path.join(__dirname, "..", "..", "views", "layouts"),
            }));

            // Add a GET route for convenient links to command handler invocation, as a normal automation client doesn't expose one
            exp.get("/command/:name", async (req, res) => {
                const payload = req.query;
                const command = automationClientInstance().automations.automations.commands.find(c => c.name === req.params.name);
                if (!command) {
                    return res.status(404).send(`Command '${req.params.name}' not found`);
                }
                return res.render(
                    "command",
                    {
                        payload,
                        command,
                        configuration: automationClientInstance().configuration,
                    });
            });
            exp.post("/command/:name", async (req, res) => {
                const command = automationClientInstance().automations.automations.commands.find(c => c.name === req.params.name);
                if (!command) {
                    return res.status(404).send(`Command '${req.params.name}' not found`);
                }
                const payload = req.body;
                const invocation: CommandHandlerInvocation = {
                    name: req.params.name,
                    parameters: payload,
                    mappedParameters: payload,
                    workspaceName: teamContext.workspaceName,
                    workspaceId: teamContext.workspaceId,
                    correlationId: await newCliCorrelationId(),
                };
                return invokeCommandHandlerInProcess(async result => {
                    const r = await result;
                    return res.render(
                        "result",
                        {
                            result: JSON.stringify(decircle(r), null, 2),
                            command,
                            configuration: automationClientInstance().configuration,
                        });
                })(invocation);
            });
            exp.post("/atomist/link-image/teams/:team", async (req, res) => {
                const payload = req.body;
                const invocation: EventHandlerInvocation = {
                    name: "FindArtifactOnImageLinked",
                    payload: {
                        ImageLinked: [{
                            commit: {
                                sha: payload.git.sha,
                                repo: {
                                    owner: payload.git.owner,
                                    name: payload.git.repo,
                                    org: {
                                        provider: {
                                            providerId: "n/a",
                                        },
                                    },
                                },
                            },
                            image: {
                                image: payload.docker.image,
                                imageName: payload.docker.image,
                            },
                        }],
                    },
                };
                // TODO Hack to get image into the Push
                eventStore().messages().filter(m => m.value.sha === payload.git.sha && m.value.goalSet && m.value.goalSetId)
                    .forEach(m => _.set(m.value, "push.after.image.imageName", payload.docker.image));
                return invokeEventHandlerInProcess(
                    { workspaceId: req.params.team, workspaceName: req.params.team })(invocation)
                    .then(resp => res.json(decircle(resp)),
                        boo => res.status(500).send(boo.message));
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

                const storedCommand = (storedAction as any).command;
                if (!storedCommand) {
                    logger.error("No command stored on action object: %j", storedAction);
                    return res.status(500).send("This will never work");
                }
                const command = automationClientInstance().automations.automations.commands.find(c => c.name === storedCommand.name);
                if (!command) {
                    return res.status(404).send(`Command '${req.params.name}' not found`);
                }
                logger.debug("The command name is: %s", storedCommand.name);
                logger.debug("The parameters are: %j", command.parameters);
                logger.debug("The stored parameters are: %j", storedCommand.parameters);
                logger.debug("The command description is: %s", storedCommand.description);
                return res.render(
                    "command",
                    {
                        payload: storedCommand.parameters,
                        command,
                        configuration: automationClientInstance().configuration,
                    });
            });
        },
    ];
}

function configureListeners(configuration: Configuration) {
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
function configureMessageClientFactory(configuration: Configuration,
                                       teamContext: LocalWorkspaceContext,
                                       actionStore: ActionStore) {
    configuration.http.messageClientFactory =
        aca => {
            assert(!!aca.context.correlationId);
            const channel = parseChannel(aca.context.correlationId);
            const portToCommunicateToListenerOn = parsePort(aca.context.correlationId);
            return new BroadcastingMessageClient(
                new HttpClientMessageClient({
                    workspaceId: teamContext.workspaceId,
                    channel,
                    port: AllMessagesPort,
                    actionStore,
                    transient: false,
                }),
                new GoalEventForwardingMessageClient(),
                // Communicate back to client if possible
                !!portToCommunicateToListenerOn ? new HttpClientMessageClient({
                    workspaceId: teamContext.workspaceId,
                    channel,
                    port: portToCommunicateToListenerOn,
                    actionStore,
                    transient: true,
                }) : undefined,
            );
        };
}

function configureGraphClient(configuration: Configuration) {
    configuration.http.graphClientFactory =
        () => new LocalGraphClient(false);
}
