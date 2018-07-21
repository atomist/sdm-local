import { Configuration, logger } from "@atomist/automation-client";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { mergeConfiguration } from "./mergeConfiguration";

import * as _ from "lodash";
import { LocalGraphClient } from "../binding/LocalGraphClient";
import { SystemNotificationMessageClient } from "../invocation/cli/io/SystemNotificationMessageClient";
import { isLocal } from "./isLocal";
import { DefaultConfig } from "../entry/resolveConnectionConfig";

/**
 * Enable local post processing
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
                exp.get("/localConfiguration", async (req, res) => {
                    res.json(config);
                });
            },
        ];

        // TODO what if not basic
        _.set(configuration, "http.auth.basic.enabled", false);

        // TODO resolve channel
        // TODO allow this to be configured in config
        configuration.http.messageClientFactory =
            // () => new ConsoleMessageClient("general");
            // TODO think about this
            () => new SystemNotificationMessageClient("general", DefaultConfig);

        configuration.http.graphClientFactory =
            () => new LocalGraphClient();

        const enrichedConfig = mergeConfiguration(config);

        // Need extra config to know how to set things in the SDM
        configuration.sdm = {
            ...configuration.sdm,
            ...enrichedConfig.sdm,
        };
        return configuration;
    };
}
