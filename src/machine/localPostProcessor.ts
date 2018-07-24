import { Configuration, HandlerContext, HandlerResult, logger } from "@atomist/automation-client";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { mergeConfiguration } from "./mergeConfiguration";

import { CommandInvocation } from "@atomist/automation-client/internal/invoker/Payload";
import { AutomationEventListenerSupport } from "@atomist/automation-client/server/AutomationEventListener";
import { CustomEventDestination } from "@atomist/automation-client/spi/message/MessageClient";
import * as _ from "lodash";
import { LocalGraphClient } from "../binding/LocalGraphClient";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
import { AllMessagesPort } from "../invocation/cli/command/addStartListener";
import { BroadcastingMessageClient } from "../invocation/cli/io/BroadcastingMessageClient";
import { GoalEventForwardingMessageClient } from "../invocation/cli/io/GoalEventForwardingMessageClient";
import { HttpClientMessageClient } from "../invocation/cli/io/HttpClientMessageClient";
import { SystemNotificationMessageClient } from "../invocation/cli/io/SystemNotificationMessageClient";
import { isLocal } from "./isLocal";

/**
 * Configures server to enable operation
 * @param {LocalMachineConfig} config
 * @return {(configuration: Configuration) => Promise<Configuration>}
 */
export function supportLocal(config: LocalMachineConfig): (configuration: Configuration) => Promise<Configuration> {
    return async configuration => {

        // Don't mess with a non local machine
        if (!isLocal()) {
            return configuration;
        }

        logger.info("Disable web socket connection");
        configuration.ws.enabled = false;

        // Serve up local configuration
        configuration.http.customizers = [
            exp => {
                // TODO could use this to set local mode for a server - e.g. the name to send to
                exp.get("/localConfiguration", async (req, res) => {
                    res.json(config);
                });
            },
        ];

        // Disable auth as we're only expecting local clients
        // TODO what if not basic
        _.set(configuration, "http.auth.basic.enabled", false);

        // TODO resolve channel
        // TODO allow what's sent to be configured in config?
        configuration.http.messageClientFactory =
            aca => new BroadcastingMessageClient(
                new HttpClientMessageClient("general", AllMessagesPort),
                new GoalEventForwardingMessageClient(DefaultAutomationClientConnectionConfig),
                new HttpClientMessageClient("general", 1234),
                new SystemNotificationMessageClient("general", DefaultAutomationClientConnectionConfig),
            );
        // TODO think about this
        // () => new SystemNotificationMessageClient("general", DefaultAutomationClientConnectionConfig);

        configuration.http.graphClientFactory =
            () => new LocalGraphClient();

        if (!configuration.listeners) {
            configuration.listeners = [];
        }
        configuration.listeners.push(new NotifyOnCompletionAutomationEventListener());

        const localModeSdmConfigurationElements = mergeConfiguration(config);

        // Need extra config to know how to set things in the SDM
        configuration.sdm = {
            ...configuration.sdm,
            ...localModeSdmConfigurationElements.sdm,
        };
        return configuration;
    };
}

export const CommandCompletionDestination = new CustomEventDestination("completion");

class NotifyOnCompletionAutomationEventListener extends AutomationEventListenerSupport {

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<void> {
        return ctx.messageClient.send("Success", CommandCompletionDestination);
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, err: any): Promise<void> {
        return ctx.messageClient.send("Failure", CommandCompletionDestination);
    }
}
