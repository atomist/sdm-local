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

import { Configuration } from "@atomist/automation-client";
import { automationClient } from "@atomist/automation-client/automationClient";
import { defaultConfiguration, invokePostProcessors } from "@atomist/automation-client/configuration";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { configureSdm, createSoftwareDeliveryMachine } from "@atomist/sdm-core";
import { ConfigureMachine } from "@atomist/sdm/api/machine/MachineConfigurer";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm/api/machine/SoftwareDeliveryMachineOptions";
import { DefaultWorkspaceId } from "../../common/binding/defaultWorkspaceContextResolver";

import { determineDefaultRepositoryOwnerParentDirectory } from "../../common/configuration/defaultLocalModeConfiguration";
import { defaultHostUrlAliaser } from "../../common/util/http/defaultLocalHostUrlAliaser";
import { configureLocal } from "../../sdm/configuration/localPostProcessor";
import { LocalSdmConfig } from "../../sdm/configuration/localSdmConfig";
import { LocalLifecycle } from "../../sdm/ui/localLifecycle";
import { AutomationClientInfo } from "../AutomationClientInfo";
import { fetchMetadataFromAutomationClient } from "../invocation/http/fetchMetadataFromAutomationClient";

/**
 * Default port on which to start an embedded machine.
 * @type {number}
 */
export const DefaultEmbeddedMachinePort = 2900;

/**
 * Options for starting an embedded machine.
 */
export interface EmbeddedMachineOptions {
    name?: string;
    repositoryOwnerParentDirectory?: string;
    configure: ConfigureMachine;
    port?: number;

    /**
     * Whether to suppress log output. It will normally
     * be routed to the console.
     */
    suppressConsoleLog?: boolean;
}

const createMachine = (configure: ConfigureMachine) => (config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine => {
    const sdm: SoftwareDeliveryMachine = createSoftwareDeliveryMachine(
        {
            name: "Local bootstrap SDM",
            configuration: config,
        });
    sdm.addExtensionPacks(LocalLifecycle, LocalSdmConfig);
    configure(sdm);
    return sdm;
};

function configurationFor(options: EmbeddedMachineOptions): Configuration {
    const cfg = defaultConfiguration();
    cfg.name = options.name || "bootstrap";
    cfg.teamIds = [DefaultWorkspaceId];
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

    cfg.token = "not.your.token";
    cfg.apiKey = "not.your.apiKey";

    cfg.postProcessors = [
        configureLocal({
            repositoryOwnerParentDirectory: options.repositoryOwnerParentDirectory,
            mergeAutofixes: true,
            preferLocalSeeds: false,
            forceLocal: true,
        }),
        async config => {
            delete process.env.ATOMIST_MODE;
            return config;
        },
        configureSdm(createMachine(options.configure), {}),
    ];

    return cfg;
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
        repositoryOwnerParentDirectory: options.repositoryOwnerParentDirectory || determineDefaultRepositoryOwnerParentDirectory(),
    };

    if (!options.suppressConsoleLog) {
        process.env.ATOMIST_DISABLE_LOGGING = "false";
    }
    process.env.ATOMIST_MODE = "local";
    const config = await invokePostProcessors(
        configurationFor(optsToUse));

    const client = automationClient(config);
    await client.run();
    const coords = {
        baseEndpoint: `http://${defaultHostUrlAliaser().alias()}:${optsToUse.port}`,
    };
    return fetchMetadataFromAutomationClient(coords);
}
