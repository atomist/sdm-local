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

import { ConfigureMachine, ParametersDefinition } from "@atomist/sdm";
import { toParametersListing } from "@atomist/sdm/api-helper/machine/handlerRegistrations";
import { startEmbeddedMachine } from "../../../embedded/embeddedMachine";
import { errorMessage, infoMessage, logExceptionsToConsole } from "../../../ui/consoleOutput";
import { fetchMetadataFromAutomationClient } from "../../http/fetchMetadataFromAutomationClient";
import { CommandInvocationListener, runCommandOnColocatedAutomationClient } from "./runCommandOnColocatedAutomationClient";
import { YargSaver } from "./YargSaver";

/**
 * Spec for running an embedded command on an ephemeral SDM
 */
export interface EmbeddedCommandSpec {

    /**
     * Command name
     */
    name: string;

    cliCommand: string;

    cliDescription: string;

    parameters?: ParametersDefinition;

    build?: (argv: YargSaver) => void;

    /**
     * Listeners to command invocation
     */
    listeners?: CommandInvocationListener[];

    /**
     * Configure the sdm.machine to run the command
     */
    configurer: (argv: YargSaver) => Promise<ConfigureMachine>;

}

/**
 * Add a command, asking for repositoryOwnerParentDirectory, and spawn an SDM
 * to execute it. Shut the sdm.machine down afterwards.
 * Once the client connects, it will prompt for parameters required by the command.
 * These parameters can also be passed through using the initial yargs request,
 * being exposed as optional command parameters.
 * @param {yargs.Argv} yargs
 */
export function addEmbeddedCommand(yargs: YargSaver,
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
            if (!!spec.parameters) {
                const pl = toParametersListing(spec.parameters);
                for (const param of pl.parameters) {
                    ra.option(param.name, {
                        description: param.description,
                        required: false,
                    });
                }
            }
            if (!!spec.build) {
                spec.build(ra);
            }
            return ra;
        },
        handler: async argv => {
            return logExceptionsToConsole(async () => {
                await runCommandOnEmbeddedMachine(
                    argv.repositoryOwnerParentDirectory,
                    await spec.configurer(argv),
                    spec.name,
                    argv,
                    spec.listeners);
                infoMessage("Execution of command %s complete", spec.name);
            }, true);
        },
    });
}

async function runCommandOnEmbeddedMachine(repositoryOwnerParentDirectory: string,
                                           configure: ConfigureMachine,
                                           name: string,
                                           params: object,
                                           listeners: CommandInvocationListener[] = []) {
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
    return runCommandOnColocatedAutomationClient(
        aca.connectionConfig,
        aca.localConfig.repositoryOwnerParentDirectory,
        {
            workspaceName: "embedded",
            workspaceId: "T0",
        },
        hm,
        params, listeners);
}
