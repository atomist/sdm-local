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

import {
    HandlerResult,
    logger,
    RepoId,
} from "@atomist/automation-client";
import { Arg } from "@atomist/automation-client/lib/internal/invoker/Payload";
import {
    CommandHandlerMetadata,
    Parameter,
} from "@atomist/automation-client/lib/metadata/automationMetadata";
import { LocalSoftwareDeliveryMachineOptions } from "@atomist/sdm-core";
import chalk from "chalk";
import * as inquirer from "inquirer";
import * as _ from "lodash";
import { CommandHandlerInvocation } from "../../../../common/invocation/CommandHandlerInvocation";
import { InvocationTarget } from "../../../../common/invocation/InvocationTarget";
import { credentialsFromEnvironment } from "../../../../sdm/binding/EnvironmentTokenCredentialsResolver";
import { ExtraParametersMappedParameterResolver } from "../../../../sdm/binding/mapped-parameter/CommandLineMappedParameterResolver";
import { FromAnyMappedParameterResolver } from "../../../../sdm/binding/mapped-parameter/FromAnyMappedParameterResolver";
import { MappedParameterResolver } from "../../../../sdm/binding/mapped-parameter/MappedParameterResolver";
import { ExpandedTreeMappedParameterResolver } from "../../../../sdm/binding/project/ExpandedTreeMappedParameterResolver";
import { expandedTreeRepoFinder } from "../../../../sdm/binding/project/expandedTreeRepoFinder";
import { parseOwnerAndRepo } from "../../../../sdm/binding/project/expandedTreeUtils";
import { defaultLocalSoftwareDeliveryMachineConfiguration } from "../../../../sdm/configuration/defaultLocalSoftwareDeliveryMachineConfiguration";
import { HttpMessageListener } from "../../../../sdm/ui/HttpMessageListener";
import {
    infoMessage,
    warningMessage,
} from "../../../ui/consoleOutput";
import { AutomationClientConnectionRequest } from "../../http/AutomationClientConnectionRequest";
import { invokeCommandHandlerUsingHttp } from "../../http/invokeCommandHandlerUsingHttp";
import { newCliCorrelationId } from "../../http/support/newCorrelationId";
import { portToListenOnFor } from "../../http/support/portAllocation";
import { suggestStartingAllMessagesListener } from "./suggestStartingAllMessagesListener";

/**
 * Listeners to command execution
 */
export interface CommandInvocationListener {

    /**
     * Action to perform after running the command
     * @return {Promise<any>}
     */
    before?: (chm: CommandHandlerMetadata) => Promise<any>;

    onDispatch?: (chm: CommandHandlerMetadata, inv: CommandHandlerInvocation) => Promise<any>;

    /**
     * Action to perform after running the command
     * @return {Promise<any>}
     */
    after?: (h: HandlerResult, inv: CommandHandlerInvocation, chm: CommandHandlerMetadata) => Promise<any>;
}

/**
 * All invocations from the CLI to local SDMs go through this function.
 * Validate command line arguments and prompt for missing or invalid arguments.
 * @param command command populated by yargs
 * @return {Promise<any>}
 */
export async function runCommandOnColocatedAutomationClient(connectionConfig: AutomationClientConnectionRequest,
                                                            opts: LocalSoftwareDeliveryMachineOptions,
                                                            target: InvocationTarget,
                                                            hm: CommandHandlerMetadata,
                                                            command: any,
                                                            listeners: CommandInvocationListener[]): Promise<any> {
    for (const l of listeners) {
        if (!!l.before) {
            await l.before(hm);
        }
    }
    const listener = new HttpMessageListener({
        port: await portToListenOnFor(process.pid),
        transient: true,
    }).start();
    const extraArgs = Object.getOwnPropertyNames(command)
        .map(name => ({ name: convertToUsable(name), value: command[name] }))
        .filter(keep => !!keep.value);
    const args = [
        { name: "github://user_token?scopes=repo,user:email,read:user", value: credentialsFromEnvironment().token },
    ]
        .concat(extraArgs);
    await promptForMissingParameters(hm, args);
    const mpr: MappedParameterResolver =
        new FromAnyMappedParameterResolver(
            new ExpandedTreeMappedParameterResolver(opts.repositoryOwnerParentDirectory),
            new ExtraParametersMappedParameterResolver(extraArgs),
        );
    const mappedParameters: Array<{ name: any; value: string | undefined }> = hm.mapped_parameters.map(mp => ({
        name: mp.name,
        value: mpr.resolve(mp),
    }));
    await promptForMissingMappedParameters(hm, mappedParameters);

    const correlationId = await newCliCorrelationId({
        channel: parseOwnerAndRepo(opts.repositoryOwnerParentDirectory).repo,
        encodeListenerPort: true,
    });

    const invocation: CommandHandlerInvocation = {
        name: hm.name,
        // targets.repos is gathered through the mapped parameters query flow, but
        // is actually a normal parameter
        parameters: args.concat(mappedParameters.filter(mp => mp.name === "targets.repos")),
        mappedParameters: mappedParameters.filter(mp => !!mp.value).filter(mp => mp.name !== "targets.repos"),
        ...target,
        correlationId,
    };
    logger.debug("Sending invocation %j\n", invocation);
    await Promise.all(listeners
        .filter(l => !!l.onDispatch)
        .map(l => l.onDispatch(hm, invocation)));
    // Use repo channel if we're in a mapped repo channel
    const r = await invokeCommandHandlerUsingHttp(connectionConfig)(invocation);
    await Promise.all(listeners
        .filter(l => !!l.after)
        .map(l => l.after(r, invocation, hm)));

    await suggestStartingAllMessagesListener();

    if (listener.canTerminate) {
        process.exit(0);
    }
    return r;
}

function valid(p: Parameter, value: any): boolean {
    return !p.pattern || new RegExp(p.pattern).test(value);
}

/**
 * Gather missing parameters from the command line and add them to args
 * @param {CommandHandlerMetadata} hi
 * @param args Args we've already found
 * @return {object}
 */
async function promptForMissingParameters(hi: CommandHandlerMetadata, args: Arg[]): Promise<void> {
    function findArg(p: Parameter): Arg {
        return args.find(a => a.name === p.name);
    }

    function mustBeSupplied(p: Parameter) {
        const arg = findArg(p);
        return p.required && (
            !arg || arg.value === undefined ||
            !valid(p, arg.value.toString())
        );
    }

    function validInputDisplay(p: Parameter): string {
        return p.valid_input ? (": " + chalk.italic(p.valid_input)) : "";
    }

    _.sortBy(hi.parameters, p => p.name)
        .map(p => ({ parameter: p, arg: findArg(p) }))
        .filter(pair => !!pair.arg && !!pair.arg.value)
        .filter(pair => !valid(pair.parameter, pair.arg.value.toString()))
        .forEach(pair => warningMessage("Value of '%s' for '%s' is invalid%s\n",
            pair.arg.value, pair.parameter.name,
            validInputDisplay(pair.parameter)));

    const questions = hi.parameters
        .filter(mustBeSupplied)
        .map(p => {
            const nameToUse = convertToDisplayable(p.name);
            return {
                name: nameToUse,
                default: p.default_value,
                message: p.description,
                validate: (value: any) => {
                    if (valid(p, value)) {
                        return true;
                    }
                    return `Please enter a valid ${nameToUse}${validInputDisplay(p)}`;
                },
            };
        });
    const fromPrompt = await inquirer.prompt(questions) as any;
    Object.getOwnPropertyNames(fromPrompt)
        .forEach(enteredName => {
            // Replace any existing argument with this name that yargs has
            _.remove(args, arg => arg.name === enteredName);
            args.push({
                name: convertToUsable(enteredName),
                value: fromPrompt[enteredName],
            });
        });
}

/**
 * Field handled specially for transform targets
 */
const TargetsOwnerField = "targets.owner";

/**
 * Field handled specially for transform targets
 */
const TargetsRepoField = "targets.repo";

/**
 * Pattern to match all repos
 */
const AllReposPattern = "all repos";

/**
 * Pattern for a custom regular expression
 */
const RegexPattern = "custom regex";

/**
 * Gather missing mapped parameters from the command line and add them to args
 * @param {CommandHandlerMetadata} hi
 * @param mappedParameters mapped parameters we've already found
 * @return {object}
 */
async function promptForMissingMappedParameters(hi: CommandHandlerMetadata, mappedParameters: Array<{ name: string; value: string }>): Promise<void> {
    const allRepos = await determineAvailableRepos();
    // Don't ask for repo filter if we have an owner
    if (mappedParameters.some(mp => mp.name === TargetsOwnerField && !!mp.value) &&
        !mappedParameters.some(mp => mp.name === TargetsRepoField && !!mp.value)) {
        addOrReplaceMappedParameter(mappedParameters, TargetsRepoField, AllReposPattern);
    }
    const questions: inquirer.Question[] =
        mappedParameters
            .filter(mp => !mp.value)
            .map(p => {
                const nameToUse = convertToDisplayable(p.name);
                return {
                    name: nameToUse,
                    message: () => {
                        switch (p.name) {
                            case TargetsOwnerField :
                                return "Org to target";
                            case TargetsRepoField :
                                return "Repos to target";
                            default :
                                return `(mapped parameter) ${nameToUse}`;
                        }
                    },
                    // Use a dropdown for orgs and repos
                    type: [TargetsOwnerField, TargetsRepoField].includes(p.name) ? "list" : "string",
                    // Choices will be undefined unless it's a list type
                    choices: (answer: any) => {
                        switch (p.name) {
                            case TargetsOwnerField :
                                return _.uniq(allRepos.map(r => r.owner));
                            case TargetsRepoField :
                                // Used the mapped name, which will be bound to the answer
                                const owner = answer[convertToDisplayable(TargetsOwnerField)];
                                return (allRepos.filter(r => r.owner === owner).map(r => r.repo) as any[])
                                    .concat(new inquirer.Separator(),
                                    chalk.italic(AllReposPattern),
                                    // chalk.italic(RegexPattern)
                            );
                            default: return undefined;
                        }
                    },
                    validate: (value: any) => {
                        // We don't really know how to validate this,
                        // but make the user input something
                        const mpdef = hi.mapped_parameters.find(mp => mp.name === p.name);
                        if (!!value || (mpdef && (!mpdef.required))) {
                            return true;
                        }
                        return `Please enter a valid value`;
                    },
                };
            });
    const fromPrompt = await inquirer.prompt(questions) as any;

    Object.getOwnPropertyNames(fromPrompt)
        .forEach(enteredName => {
            addOrReplaceMappedParameter(mappedParameters, convertToUsable(enteredName), fromPrompt[enteredName]);
        });

    const trReposField = fromPrompt[convertToDisplayable(TargetsRepoField)];
    if (!!trReposField && trReposField.includes(AllReposPattern)) {
        addOrReplaceMappedParameter(mappedParameters, "targets.repo");
        addOrReplaceMappedParameter(mappedParameters, "targets.repos", ".*");
    } else if (!!trReposField && trReposField.includes(RegexPattern)) {
        // Ask extra question to clarify regex if we need to
        const filter = await inquirer.prompt<{regex: string}>([{
            name: "regex",
            message: "Regex to filter repos by name: Considering including anchors",
        }]);
        infoMessage("Using regex pattern /%s/\n", filter.regex);
        addOrReplaceMappedParameter(mappedParameters, "targets.repo");
        addOrReplaceMappedParameter(mappedParameters, "targets.repos", filter.regex);
    }
    logger.debug("Mapped parameters after prompt are %j", mappedParameters);
}

/**
 * If value is undefined, delete it
 */
function addOrReplaceMappedParameter(mappedParameters: Array<{name: string, value: string}>, name: string, value?: string) {
    _.remove(mappedParameters, arg => arg.name === name);
    if (!!value) {
        mappedParameters.push({name, value});
    }
}

/**
 * Return all available repos
 * @param repositoryOwnerParentDirectory base of expanded tree
 */
async function determineAvailableRepos(opts: LocalSoftwareDeliveryMachineOptions =
                                           defaultLocalSoftwareDeliveryMachineConfiguration({}).local): Promise<RepoId[]> {
    return expandedTreeRepoFinder(opts)(undefined);
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
