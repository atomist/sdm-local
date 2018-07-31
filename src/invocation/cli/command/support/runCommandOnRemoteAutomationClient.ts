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

import { logger } from "@atomist/automation-client";
import { Arg } from "@atomist/automation-client/internal/invoker/Payload";
import { CommandHandlerMetadata, Parameter } from "@atomist/automation-client/metadata/automationMetadata";
import * as inquirer from "inquirer";
import * as _ from "lodash";
import { FromAnyMappedParameterResolver } from "../../../../sdm/binding/mapped-parameter/FromAnyMappedParameterResolver";
import { MappedParameterResolver } from "../../../../sdm/binding/mapped-parameter/MappedParameterResolver";
import { startHttpMessageListener } from "../../../../sdm/binding/message/httpMessageListener";
import { ExpandedTreeMappedParameterResolver } from "../../../../sdm/binding/project/ExpandedTreeMappedParameterResolver";
import { parseOwnerAndRepo } from "../../../../sdm/binding/project/expandedTreeUtils";
import { newCorrelationId, pidToPort } from "../../../../machine/correlationId";
import { AutomationClientConnectionConfig } from "../../../http/AutomationClientConnectionConfig";
import { CommandHandlerInvocation, invokeCommandHandler } from "../../../http/CommandHandlerInvocation";
import { suggestStartingAllMessagesListener } from "./suggestStartingAllMessagesListener";

/**
 * All invocation goes through this
 * @return {Promise<any>}
 */
export async function runCommandOnRemoteAutomationClient(connectionConfig: AutomationClientConnectionConfig,
                                                         repositoryOwnerParentDirectory: string,
                                                         hm: CommandHandlerMetadata,
                                                         command: object): Promise<any> {
    await suggestStartingAllMessagesListener();
    startHttpMessageListener(connectionConfig, pidToPort(process.pid), true);
    const extraArgs = Object.getOwnPropertyNames(command)
        .map(name => ({ name: convertToUsable(name), value: command[name] }))
        .filter(keep => !!keep.value);
    const args = [
        { name: "github://user_token?scopes=repo,user:email,read:user", value: null },
    ]
        .concat(extraArgs);
    await promptForMissingParameters(hm, args);
    const mpr: MappedParameterResolver =
        new FromAnyMappedParameterResolver(new ExpandedTreeMappedParameterResolver(repositoryOwnerParentDirectory));
    const mappedParameters: Array<{ name: any; value: string | undefined }> = hm.mapped_parameters.map(mp => ({
        name: mp.name,
        value: mpr.resolve(mp),
    }));
    await promptForMissingMappedParameters(hm, mappedParameters);
    const invocation: CommandHandlerInvocation = {
        name: hm.name,
        parameters: args,
        mappedParameters: mappedParameters.filter(mp => !!mp.value),
    };
    logger.debug("Sending invocation %j\n", invocation);
    // Use repo channel if we're in a mapped repo channel
    const correlationId = newCorrelationId({ channel: parseOwnerAndRepo(repositoryOwnerParentDirectory).repo, encodeListenerPort: true });
    return invokeCommandHandler(connectionConfig, invocation, correlationId);
}

/**
 * Gather missing parameters from the command line and add them to args
 * @param {CommandHandlerMetadata} hi
 * @param args Args we've already found
 * @return {object}
 */
async function promptForMissingParameters(hi: CommandHandlerMetadata, args: Arg[]): Promise<void> {
    function mustBeSupplied(p: Parameter) {
        return p.required && (args.find(a => a.name === p.name) === undefined || args.find(a => a.name === p.name).value === undefined);
    }

    const questions =
        hi.parameters
            .filter(mustBeSupplied)
            .map(p => {
                const nameToUse = convertToDisplayable(p.name);
                return {
                    name: nameToUse,
                    default: p.default_value,
                    message: p.description,
                    validate: value => {
                        const pass = !p.pattern || value.match(new RegExp(p.pattern));
                        if (pass) {
                            return true;
                        }
                        return `Please enter a valid ${nameToUse} - ${p.valid_input}`;
                    },
                };
            });
    const fromPrompt = await inquirer.prompt(questions);
    Object.getOwnPropertyNames(fromPrompt)
        .forEach(enteredName => {
            // Replace any existing argument with this name that yargs has
            _.remove(args, arg => arg.name === enteredName);
            args.push({ name: convertToUsable(enteredName), value: fromPrompt[enteredName] });
        });
}

async function promptForMissingMappedParameters(hi: CommandHandlerMetadata, mappedParameters: Array<{ name: string; value: string }>): Promise<void> {
    const questions =
        mappedParameters
            .filter(mp => !mp.value)
            .map(p => {
                const nameToUse = convertToDisplayable(p.name);
                return {
                    name: nameToUse,
                    message: `(mapped parameter) ${nameToUse}`,
                };
            });
    const fromPrompt = await inquirer.prompt(questions);
    Object.getOwnPropertyNames(fromPrompt)
        .forEach(enteredName => {
            // Replace any existing argument with this name that yargs has
            _.remove(mappedParameters, arg => arg.name === enteredName);
            mappedParameters.push({ name: convertToUsable(enteredName), value: fromPrompt[enteredName] });
        });
}

/**
 * Convert this command to a displayable name
 * @param {string} name
 * @return {string}
 */
export function convertToDisplayable(name: string): string {
    const display = name.replace(".", "-");
    return display;
}

function convertToUsable(entered: string): string {
    return entered.replace("-", ".");
}
