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
import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";
import { LocalLifecycle } from "../../sdm/machine/localLifecycle";
import { configureLocal } from "../../sdm/machine/localPostProcessor";

const BootstrapPort = 2867;

const createMachine = (configure: ConfigureMachine) => (config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine => {
    const sdm: SoftwareDeliveryMachine = createSoftwareDeliveryMachine(
        {
            name: "Slalom bootstrap sdm.machine",
            configuration: config,
        });
    sdm.addExtensionPacks(LocalLifecycle);
    configure(sdm);
    return sdm;
};

function configurationFor(repositoryOwnerParentDirectory: string,
                          configure: ConfigureMachine): Configuration {
    const cfg = defaultConfiguration();
    cfg.name = "@atomist/slalom-bootstrap";
    cfg.http.port = BootstrapPort;

    cfg.logging.level = "info";
    cfg.logging.file.enabled = false;

    cfg.ws.enabled = false;
    cfg.applicationEvents.enabled = false;

    cfg.commands = [];
    cfg.events = [];
    cfg.ingesters = [];
    cfg.listeners = [];

    cfg.postProcessors = [
        configureLocal({
            repositoryOwnerParentDirectory,
            mergeAutofixes: true,
            preferLocalSeeds: false,
            forceLocal: true,
        }),
        configureSdm(createMachine(configure), {}),
    ];

    return cfg;
}

/**
 * Create an embedded SDM to perform bootstrap commands such as
 * generating a new SDM
 * @param {string} repositoryOwnerParentDirectory
 * @return {Promise<AutomationClientConnectionConfig>}
 */
export async function createBootstrapMachine(repositoryOwnerParentDirectory: string,
                                             configure: ConfigureMachine,
): Promise<AutomationClientConnectionConfig> {
    const config = await invokePostProcessors(
        configurationFor(repositoryOwnerParentDirectory, configure));
    const client = automationClient(config);
    return client.run()
        .then(() => ({
            atomistTeamId: "T123",
            atomistTeamName: "slalom",
            baseEndpoint: `http://localhost:${BootstrapPort}`,
        }));
}
