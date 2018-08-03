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
import {
    defaultConfiguration,
    invokePostProcessors,
} from "@atomist/automation-client/configuration";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import {
    configureSdm,
    createSoftwareDeliveryMachine,
} from "@atomist/sdm-core";
import { ConfigureMachine } from "@atomist/sdm/api/machine/MachineConfigurer";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm/api/machine/SoftwareDeliveryMachineOptions";

import * as os from "os";
import { determineDefaultRepositoryOwnerParentDirectory } from "../../sdm/configuration/createSdmOptions";
import { LocalLifecycle } from "../../sdm/configuration/localLifecycle";
import { configureLocal } from "../../sdm/configuration/localPostProcessor";
import {
    AutomationClientConnectionConfig,
    AutomationClientConnectionRequest,
} from "../invocation/http/AutomationClientConnectionConfig";

const DefaultBootstrapPort = 2900;

/**
 * Options for starting an embedded machine.
 */
export interface EmbeddedMachineOptions {
    repositoryOwnerParentDirectory?: string;
    configure: ConfigureMachine;
    port?: number;
}

const createMachine = (configure: ConfigureMachine) => (config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine => {
    const sdm: SoftwareDeliveryMachine = createSoftwareDeliveryMachine(
        {
            name: "Local bootstrap sdm.machine",
            configuration: config,
        });
    sdm.addExtensionPacks(LocalLifecycle);
    configure(sdm);
    return sdm;
};

function configurationFor(options: EmbeddedMachineOptions): Configuration {
    const cfg = defaultConfiguration();
    cfg.name = "@atomist/local-sdm-bootstrap";
    cfg.teamIds = ["local"];
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
    cfg.apiKey = "not.your.token";

    cfg.postProcessors = [
        configureLocal({
            repositoryOwnerParentDirectory: options.repositoryOwnerParentDirectory,
            mergeAutofixes: true,
            preferLocalSeeds: false,
            forceLocal: true,
        }),
        configureSdm(createMachine(options.configure), {}),
    ];

    return cfg;
}

/**
 * Create an embedded SDM to perform bootstrap commands such as
 * generating a new SDM
 * @return {Promise<AutomationClientConnectionConfig>}
 */
export async function startEmbeddedMachine(options: EmbeddedMachineOptions): Promise<AutomationClientConnectionRequest> {
    const optsToUse: EmbeddedMachineOptions = {
        port: DefaultBootstrapPort,
        ...options,
        repositoryOwnerParentDirectory: options.repositoryOwnerParentDirectory || determineDefaultRepositoryOwnerParentDirectory(),
    };
    const config = await invokePostProcessors(
        configurationFor(optsToUse));
    const client = automationClient(config);
    return client.run()
        .then(() => ({
            baseEndpoint: `http://${os.hostname}:${optsToUse.port}`,
        }));
}
