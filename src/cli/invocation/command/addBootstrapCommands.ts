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

import { GitHubRepoRef } from "@atomist/sdm";
import * as inquirer from "inquirer";
import { Question } from "inquirer";
import {
    adviceDoc,
    infoMessage,
} from "../../ui/consoleOutput";
import {
    sdmGenerator,
    superforkGenerator,
} from "./generator/bootstrapGenerators";
import { addEmbeddedCommand } from "./support/embeddedCommandExecution";
import {
    verifyJDK,
    verifyMaven,
} from "./support/javaVerification";
import { YargBuilder } from "./support/yargBuilder";
import { AddLocalMode } from "./transform/addLocalModeTransform";

/**
 * Add bootstrap commands to generate a new SDM
 * and add local capability to an existing SDM
 * @param {YargBuilder} yargs
 */
export function addBootstrapCommands(yargs: YargBuilder) {
    addSdmGenerator(yargs);
    addSuperforkGenerator(yargs);
    addEnableLocalSupport(yargs);
}

function addSdmGenerator(yargs: YargBuilder) {
    const choices = ["blank", "sample", "spring"];
    const typeDescription = "Type of SDM to create";
    const name = "newSdm";
    addEmbeddedCommand(yargs, {
        name,
        cliCommand: "create sdm",
        cliDescription: "Create an SDM",
        parameters: sdmGenerator(name, undefined).parameters,
        build: argv => {
            // Expose type parameter
            argv.option("type", {
                required: false,
                description: typeDescription,
                choices,
            });
            return argv;
        },
        configurer: async () => {
            adviceDoc("docs/newSdm.md");
            // Gather type parameter
            const questions: Question[] = [{
                name: "type",
                message: typeDescription,
                type: "list",
                choices,
                default: "spring",
                validate: input =>
                    choices.includes(input) ?
                        true :
                        `Please enter one of following values: ${choices}`,
            }];
            const answers = await inquirer.prompt(questions);
            switch (answers.type) {
                case "spring":
                    return sdm => {
                        sdm.addGeneratorCommand(sdmGenerator(name,
                            new GitHubRepoRef("atomist", "seed-sdm"),
                            "spring"));
                    };
                case "blank":
                    return sdm => sdm.addGeneratorCommand(sdmGenerator(name,
                        new GitHubRepoRef("atomist", "blank-sdm"),
                        "blank"));
                case "sample":
                    return sdm => sdm.addGeneratorCommand(sdmGenerator(name,
                        new GitHubRepoRef("atomist", "sample-sdm"),
                        "sample"));
                default:
                    throw new Error("Unknown SDM type " + answers.type);
            }
        },
        listeners: [{
            before: async () => {
                infoMessage("Please follow the prompts to create a new SDM\n\n");
            },
            after: async (hr, _, chm) => {
                // TODO tags seem to be getting set wrongly somewhere, or type definition is wrong
                if (chm.tags.includes("spring" as any)) {
                    await doAfterSpringSdmCreation();
                }
            },
        }],
    });
}

async function doAfterSpringSdmCreation() {
    adviceDoc("docs/springSdm.md");
    await verifyJDK();
    await verifyMaven();
}

function addSuperforkGenerator(yargs: YargBuilder) {
    const name = "superfork";
    addEmbeddedCommand(yargs, {
        name,
        cliCommand: "superfork",
        cliDescription: "Superfork a repo",
        parameters: superforkGenerator.parameters,
        configurer: async () => sdm => sdm.addGeneratorCommand(superforkGenerator),
        listeners: [{
            before: async () => {
                infoMessage("Please follow the prompts to create a new repo based on a GitHub repo\n\n");
            },
            after: async () => {
                infoMessage("Superfork complete\n");
            },
        }],
    });
}

/**
 * Add local support to this project
 * @param {YargBuilder} yargs
 */
function addEnableLocalSupport(yargs: YargBuilder) {
    addEmbeddedCommand(yargs, {
        name: "addLocalMode",
        cliCommand: "enable local",
        cliDescription: "Add local mode support to a repo",
        parameters: superforkGenerator.parameters,
        configurer: async () => sdm => sdm.addCodeTransformCommand(AddLocalMode),
        listeners: [{
            before: async () => {
                infoMessage("Will add local mode support to a GitHub repo\n\n");
            },
            after: async () => {
                adviceDoc("docs/runLocally.md");
            },
        }],
    });
}
