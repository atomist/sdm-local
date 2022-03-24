/*
 * Copyright © 2019 Atomist, Inc.
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

import { GitHubRepoRef } from "@atomist/automation-client/lib/operations/common/GitHubRepoRef";
import {
    prompt,
    Question,
} from "inquirer";
import {
    adviceDoc,
    infoMessage,
} from "../../ui/consoleOutput";
import {
    nodeGenerator,
    superforkGenerator,
} from "./generator/bootstrapGenerators";
import { NodeProjectCreationParametersDefinition } from "./generator/NodeProjectCreationParameters";
import { UpdatePackageJsonIdentification } from "./generator/updatePackageJsonIdentification";
import { addEmbeddedCommand } from "./support/embeddedCommandExecution";
import { verifyMaven } from "./support/javaVerification";
import { YargBuilder } from "./support/yargBuilder";
import { AddLocalMode } from "./transform/addLocalModeTransform";

/**
 * Add bootstrap commands to generate a new SDM
 * and add local capability to an existing SDM
 *
 * @param {YargBuilder} yargs
 */
export function addBootstrapCommands(yargs: YargBuilder): void {
    addSdmGenerator(yargs);
    addExtensionPackGenerator(yargs);
    addSuperforkGenerator(yargs);
    addEnableLocalSupport(yargs);
}

function addExtensionPackGenerator(yargs: YargBuilder, deprecated?: boolean): void {
    const name = deprecated ? "extensionPackDeprecated" : "extensionPack";
    addEmbeddedCommand(yargs, {
        name,
        cliCommand: deprecated ? "create extension pack" : "create extension-pack",
        cliDescription: "Create an Atomist extension pack",
        configurer: async () => sdm => sdm.addGeneratorCommand({
            name,
            startingPoint: new GitHubRepoRef("atomist-seeds", "sdm-pack-seed"),
            parameters: {
                ...NodeProjectCreationParametersDefinition,
                "targets.repo": {
                    pattern: /sdm-pack-[A-Za-z0-9\-_]+/,
                    description: "Repo name. Must begin 'sdm-pack'",
                    validInput: "Must begin with 'sdm-pack'",
                },
            } as any,
            transform: [
                UpdatePackageJsonIdentification,
            ],
            tags: "sdm-pack",
        }),
        listeners: [{
            after: async () => {
                infoMessage("Add your new extension pack to any SDM you please!\n");
            },
        }],
        deprecated,
    });
}

function addSdmGenerator(yargs: YargBuilder): void {
    const choices = ["aspect", "blank", "spring"];
    const typeDescription = "Type of SDM to create";
    const name = "newSdm";
    addEmbeddedCommand(yargs, {
        name,
        cliCommand: "create sdm",
        cliDescription: "Create an SDM",
        parameters: nodeGenerator(name, undefined).parameters,
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
                default: "blank",
                validate: (input: string) =>
                    choices.includes(input) ?
                        true :
                        `Please enter one of following values: ${choices}`,
            } as any];
            const answers = await prompt(questions);
            switch (answers.type) {
                case "aspect":
                    return sdm => {
                        sdm.addGeneratorCommand(nodeGenerator(name,
                            new GitHubRepoRef("atomist-seeds", "aspect"),
                            [UpdatePackageJsonIdentification],
                            "atomist"));
                    };
                case "spring":
                    return sdm => {
                        sdm.addGeneratorCommand(nodeGenerator(name,
                            new GitHubRepoRef("atomist-seeds", "demo-sdm"),
                            [UpdatePackageJsonIdentification],
                            "atomist"));
                    };
                case "blank":
                    return sdm => sdm.addGeneratorCommand(nodeGenerator(name,
                        new GitHubRepoRef("atomist-seeds", "empty-sdm"),
                        [UpdatePackageJsonIdentification],
                        "atomist"));
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
                if ((hr as any).generatedRepositoryUrl) {
                    infoMessage(`To run your new SDM:
cd ${removeUrlScheme((hr as any).generatedRepositoryUrl)};
atomist start`);
                }
            },
        }],
    });
}

function removeUrlScheme(url: string): string {
    return url.replace(/^.*:\/\//, "");
}

async function doAfterSpringSdmCreation(): Promise<void> {
    adviceDoc("docs/springSdm.md");
    // await verifyJDK();
    await verifyMaven();
}

function addSuperforkGenerator(yargs: YargBuilder): void {
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
        deprecated: true,
    });
}

/**
 * Add local support to this project
 * @param {YargBuilder} yargs
 */
function addEnableLocalSupport(yargs: YargBuilder): void {
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
        deprecated: true,
    });
}
