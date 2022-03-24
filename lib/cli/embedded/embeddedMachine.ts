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

import { automationClient } from "@atomist/automation-client/lib/automationClient";
import {
    defaultConfiguration,
    invokePostProcessors,
    Configuration,
} from "@atomist/automation-client/lib/configuration";
import {
    ConfigureMachine,
    ExtensionPack,
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm";
import * as _ from "lodash";
import { DefaultWorkspaceId } from "../../common/binding/defaultWorkspaceContextResolver";
import { configureLocal } from "../../sdm/configuration/configureLocal";
import { AutomationClientInfo } from "../AutomationClientInfo";
import { fetchMetadataFromAutomationClient } from "../invocation/http/fetchMetadataFromAutomationClient";
import { createSoftwareDeliveryMachine, LocalSoftwareDeliveryMachineConfiguration, configureSdm } from "@atomist/sdm/lib/core";

/**
 * Default port on which to start an embedded machine.
 * @type {number}
 */
export const DefaultEmbeddedMachinePort = 2900;

/**
 * Options for starting an embedded machine.
 */
export interface EmbeddedMachineOptions {

    /**
     * Machine name if we choose to customize it
     */
    name?: string;

    repositoryOwnerParentDirectory?: string;

    configure: ConfigureMachine;

    port?: number;

    /**
     * Whether to suppress log output. It will normally
     * be routed to the console.
     */
    suppressConsoleLog?: boolean;

    /**
     * Extension packs to add if we choose to control it directly.
     * Default will be local lifecycle to console
     */
    extensionPacks?: ExtensionPack[];
}

const createMachine = (options: EmbeddedMachineOptions) => (config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine => {
    const sdm: SoftwareDeliveryMachine = createSoftwareDeliveryMachine(
        {
            name: options.name || "Local bootstrap SDM",
            configuration: config,
        });
    sdm.addExtensionPacks(...(options.extensionPacks || []));
    options.configure(sdm);
    return sdm;
};

function configurationFor(options: EmbeddedMachineOptions): Configuration {
    const cfg = defaultConfiguration() as any as LocalSoftwareDeliveryMachineConfiguration;
    cfg.name = options.name || "bootstrap";
    cfg.workspaceIds = [DefaultWorkspaceId];
    cfg.http.port = options.port;

    cfg.logging.level = "info";
    cfg.logging.file.enabled = false;

    cfg.ws.enabled = false;
    cfg.applicationEvents.enabled = false;

    cfg.commands = [];
    cfg.events = [];
    cfg.ingesters = [];
    cfg.listeners = [];

    cfg.apiKey = "not.your.apiKey";

    cfg.local = {
        repositoryOwnerParentDirectory: options.repositoryOwnerParentDirectory,
        mergeAutofixes: true,
        preferLocalSeeds: false,
    };

    cfg.postProcessors = [
        configureLocal({ forceLocal: true }),
        configureSdm(createMachine(options), {}),
    ];

    return cfg as any;
}

/**
 * Create an embedded SDM to perform bootstrap commands such as
 * generating a new SDM
 * @return {Promise<AutomationClientConnectionConfig>}
 */
export async function startEmbeddedMachine(options: EmbeddedMachineOptions): Promise<AutomationClientInfo> {
    const optsToUse: EmbeddedMachineOptions = {
        port: DefaultEmbeddedMachinePort,
        ...options,
        repositoryOwnerParentDirectory: options.repositoryOwnerParentDirectory,
    };

    process.env.ATOMIST_MODE = "local";
    const config = await invokePostProcessors(configurationFor(optsToUse))  as any as LocalSoftwareDeliveryMachineConfiguration;
    _.set(config, "logging.level", "warn");

    const client = automationClient(config as any);
    await client.run();
    const coords = {
        baseEndpoint: `http://${config.local.hostname}:${optsToUse.port}`,
    };
    return fetchMetadataFromAutomationClient(coords);
}
