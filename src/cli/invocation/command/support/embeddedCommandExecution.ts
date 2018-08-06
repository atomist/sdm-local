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

import { ConfigureMachine } from "@atomist/sdm";
import { toParametersListing } from "@atomist/sdm/api-helper/machine/handlerRegistrations";
import { CommandRegistration } from "@atomist/sdm/api/registration/CommandRegistration";
import { Argv } from "yargs";
import { startEmbeddedMachine } from "../../../embedded/embeddedMachine";
import { fetchMetadataFromAutomationClient } from "../../http/fetchMetadataFromAutomationClient";
import { errorMessage, infoMessage, logExceptionsToConsole } from "./consoleOutput";
import { runCommandOnCollocatedAutomationClient } from "./runCommandOnCollocatedAutomationClient";
import { HandlerResult } from "@atomist/automation-client";

/**
 * Spec for running an embedded command on an ephemeral SDM
 */
export interface EmbeddedCommandSpec {

    cliCommand: string;

    cliDescription: string;

    registration: CommandRegistration<any>;

    /**
     * Configure the sdm.machine to run the command
     */
    configure: ConfigureMachine;

    /**
     * Action to perform after running the command
     * @return {Promise<any>}
     */
    thenDo?: (h: HandlerResult) => Promise<any>;
}

/**
 * Add a command, asking for repositoryOwnerParentDirectory, and spawn a sdm.machine
 * to execute it. Shut the sdm.machine down afterwards.
 * Once the client connects, it will prompt for parameters required by the command.
 * These parameters can also be passed through using the initial yargs request,
 * being exposed as optional command parameters.
 * @param {yargs.Argv} yargs
 */
export function addEmbeddedCommand(yargs: Argv,
                                   spec: EmbeddedCommandSpec) {
    yargs.command({
        command: spec.cliCommand,
        describe: spec.cliDescription,
        builder: ra => {
            // Always require the repositoryOwnerParentDirectory, as
            // we cannot create an embedded SDM otherwise
            ra.option("repositoryOwnerParentDirectory", {
                required: false,
                alias: "base",
                description: "Base of the checked out directory tree the new SDM will operate on",
                default: undefined,
            });

            // Expose optional parameters for the command's parameters if there are any
            if (!!spec.registration.parameters) {
                const pl = toParametersListing(spec.registration.parameters);
                for (const param of pl.parameters) {
                    ra.option(param.name, {
                        description: param.description,
                        required: false,
                    });
                }
            }
            return ra;
        },
        handler: argv => {
            return logExceptionsToConsole(async () => {
                // infoMessage("repositoryOwnerParentDirectory=%s", argv.repositoryOwnerParentDirectory);
                await runCommandOnEmbeddedMachine(
                    argv.repositoryOwnerParentDirectory,
                    spec.configure,
                    spec.registration.name,
                    argv,
                    spec.thenDo);
                infoMessage("Execution of command %s complete", spec.registration.name);
            }, true);
        },
    });
}

async function runCommandOnEmbeddedMachine(repositoryOwnerParentDirectory: string,
                                           configure: ConfigureMachine,
                                           name: string,
                                           params: object,
                                           thenDo: (h: HandlerResult) => Promise<any>) {
    const aca = await startEmbeddedMachine({
        repositoryOwnerParentDirectory,
        configure,
    });
    const ai = await fetchMetadataFromAutomationClient(aca.connectionConfig);
    if (!ai.client) {
        errorMessage("Could not connect to the bootstrap SDM at %s\n", aca.connectionConfig.baseEndpoint);
        process.exit(1);
    }
    if (!ai.localConfig) {
        infoMessage("The bootstrap SDM is not running in local mode\n");
    }
    const hm = ai.client.commands.find(c => c.name === name);
    if (!hm) {
        errorMessage("No command named '%s'\n", name);
        process.exit(1);
    }
    return runCommandOnCollocatedAutomationClient(aca.connectionConfig,
        repositoryOwnerParentDirectory,
        {
            atomistTeamName: "embedded",
            atomistTeamId: "T0",
        },
        hm,
        params, thenDo);
}
