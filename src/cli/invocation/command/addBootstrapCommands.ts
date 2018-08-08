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
import { GeneratorRegistration } from "@atomist/sdm";
import { Argv } from "yargs";
import { NodeProjectCreationParameters, NodeProjectCreationParametersDefinition } from "./generator/NodeProjectCreationParameters";
import { UpdatePackageJsonIdentification } from "./generator/updatePackageJsonIdentification";
import { adviceDoc, infoMessage } from "../../ui/consoleOutput";
import { addEmbeddedCommand } from "./support/embeddedCommandExecution";
import { GitHubNameRegExp } from "@atomist/automation-client/operations/common/params/gitHubPatterns";

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

/**
 * Creates a new repo based on the content of an existing repo
 * without making any changes
 * @type {{name: string; startingPoint: (params) => GitHubRepoRef; parameters: {owner: {pattern: RegExp; validInput: string; description: string}; repo: {pattern: RegExp; validInput: string; description: string}}; transform: (p) => Promise<Project>}}
 */
const superforkGenerator: GeneratorRegistration<{owner: string, repo: string}> = {
    name: "superfork",
    startingPoint: params => new GitHubRepoRef(params.owner, params.repo),
    parameters: {
        owner: { ...GitHubNameRegExp, description: "GitHub owner"},
        repo: { ...GitHubNameRegExp, description: "GitHub repo"},
    },
    transform: async p => p,
};

/**
 * Add bootstrap commands to generate a new SDM
 * and add local capability to an existing SDM
 * @param {yargs.Argv} yargs
 */
export function addBootstrapCommands(yargs: Argv) {
    addSdmGenerator(yargs);
    addSuperforkGenerator(yargs);
}

function addSdmGenerator(yargs: Argv) {
    addEmbeddedCommand(yargs, {
        cliCommand: "new sdm",
        cliDescription: "Create an SDM",
        registration: sdmGenerator,
        configure: sdm => sdm.addGeneratorCommand(sdmGenerator),
        beforeAction: async () => {
            infoMessage("Please follow the prompts to create a new SDM\n\n");
        },
        afterAction: async () => {
            adviceDoc("docs/springSdm.md");
            infoMessage("Type 'atomist deliver' to start CD for your new SDM\n");
        },
    });
}

function addSuperforkGenerator(yargs: Argv) {
    addEmbeddedCommand(yargs, {
        cliCommand: "superfork",
        cliDescription: "Superfork a repo",
        registration: superforkGenerator,
        configure: sdm => sdm.addGeneratorCommand(superforkGenerator),
        beforeAction: async () => {
            infoMessage("Please follow the prompts to create a new repo based on a GitHub repo\n\n");
        },
        afterAction: async () => {
            infoMessage("Superfork complete\n");
        },
    });
}