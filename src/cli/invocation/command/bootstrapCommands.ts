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

import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { GeneratorRegistration, SoftwareDeliveryMachine } from "@atomist/sdm";
import { Argv } from "yargs";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { NodeProjectCreationParameters, NodeProjectCreationParametersDefinition } from "./generator/NodeProjectCreationParameters";
import { UpdatePackageJsonIdentification } from "./generator/updatePackageJsonIdentification";
import { addEmbeddedCommand } from "./support/embeddedCommandExecution";

/**
 * Generator that can create a new SDM
 */
const sdmGenerator: GeneratorRegistration<NodeProjectCreationParameters> = {
    name: "createSdm",
    startingPoint: new GitHubRepoRef("atomist", "sample-sdm"),
    parameters: NodeProjectCreationParametersDefinition,
    transform: [
        UpdatePackageJsonIdentification,
    ],
};

export function addBootstrapCommands(yargs: Argv) {
    addSdmGenerator(yargs);
}

function addSdmGenerator(yargs: Argv) {
    addEmbeddedCommand(yargs, {
        cliCommand: "new sdm",
        cliDescription: "Create an SDM",
        registration: sdmGenerator,
        configure: configureBootstrapMachine,
    });
}

/**
 * Add bootstrap commands
 * @param {SoftwareDeliveryMachine} sdm
 */
function configureBootstrapMachine(sdm: SoftwareDeliveryMachine) {
    sdm.addGeneratorCommand(sdmGenerator);
}
