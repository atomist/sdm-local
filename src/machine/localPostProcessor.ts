import { Configuration } from "@atomist/automation-client";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { SoftwareDeliveryMachineOptions } from "@atomist/sdm";
import { mergeConfiguration } from "./mergeConfiguration";
import * as assert from "assert";

import * as _ from "lodash";
import { ConsoleMessageClient } from "../invocation/cli/io/ConsoleMessageClient";
import { LocalGraphClient } from "../binding/LocalGraphClient";
import { SystemNotificationMessageClient } from "../invocation/cli/io/SystemNotificationMessageClient";

// TODO could put this in by an extra argument to client loadConfiguration

/**
 * Enable local post processing
 * @param {LocalMachineConfig} config
 * @return {(configuration: Configuration) => Promise<Configuration>}
 */
export function supportLocal(config: LocalMachineConfig): (configuration: Configuration) => Promise<Configuration> {
    return async configuration => {

        // Look at command line? Separate alias for local?
        //if (process.env.LOCAL_ENABLED)

        process.stdout.write("DISABLING WEB *********");
        configuration.ws.enabled = false;

        // TODO what if not basic
        _.set(configuration, "http.auth.basic.enabled", false);

        // TODO resolve channel
        // TODO allow this to be configured in config
        configuration.http.messageClientFactory =
            //() => new ConsoleMessageClient("general");
        () => new SystemNotificationMessageClient("general");

        configuration.http.graphClientFactory =
            () => new LocalGraphClient();

        const enrichedConfig = mergeConfiguration(config);

        // Need extra config to know how to set things in the SDM
        configuration.sdm = {
            ...configuration.sdm,
            ...enrichedConfig.sdm,
        };

        process.stdout.write("FINISHED MONKEYING: " + JSON.stringify(configuration));


        return configuration;

    };
}
