import { ConflictResolution } from "./interfaces";
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
    Arguments,
    Argv as yargsArgv,
    Choices,
    Options as ParameterOptions,
    PositionalOptions,
    PositionalOptionsType,
} from "yargs";
import { CommandLine } from "./commandLine";
import { HandleInstructions } from "./handleInstruction";

export { PositionalOptions, PositionalOptionsType, Choices, ParameterOptions, Arguments };

/**
 * Build up data about commands, and then put them in yargs later.
 * The YargBuilder lets you add lots of commands, including ones with spaces in them.
 * Then optimize it, to combine all the commands optimally.
 * You'll get errors if you've added duplicate commands (they won't overwrite each other).
 *
 * To use it:
 * Get a new one:
 * const yargBuilder = freshYargBuilder();
 *
 * Add commands to it:
 * yargBuilder.withSubcommand(yargCommandFromSentence({ command: "do this thing already", handler: (argv)=> console.log("stuff")}))
 *
 * You can also add positional commands:
 * yargBuilder.withSubcommand(yargCommandWithPositionalArguments({ command: "run <thing>", ...}))
 *
 * Then optimize it, and save by passing a real yargs:
 * yargBuilder.build().save(yargs)
 *
 */

export interface YargBuilder extends BuildYargs {

    /**
     * Add a subcommand. Pass in a yargs-style object, except you can also include
     * conflictResolution and Parameters
     * @param command A yargs-style object, or a YargCommand from this package.
     */
    withSubcommand(command: YargCommand | SupportedSubsetOfYargsCommandMethod): void;

    withParameter(p: CommandLineParameter): void;

    // compatibility with Yargs
    /**
     * This exists to be compatible with yargs syntax
     * once we aren't using it, we could remove it
     * @param params
     */
    option(parameterName: string,
           params: ParameterOptions): YargBuilder;

    /**
     * This exists to be compatible with yargs syntax
     * But really, we'll figure out whether to call demandCommand() on yargs
     * based on whether a handler function was supplied
     * @param params
     * @deprecated
     */
    demandCommand(): YargBuilder;

    /**
     * This exists to be compatible with yargs syntax
     * once we aren't using it, we could remove it
     * @param params
     */
    command(params: SupportedSubsetOfYargsCommandMethod): YargBuilder;
}

export type CommandLineParameter = ParameterOptions & {
    parameterName: string;
};

export interface ResolveConflictWithPrompt { kind: "prompt for a choice"; commandDescription: string; uniqueChoice: string; failEverything: false; }

export type ConflictResolution = {
    kind: "expected to be unique" | "drop with warnings"
    failEverything: boolean;
    commandDescription: string;
} | ResolveConflictWithPrompt;

/**
 * If more than one of this command appear, then
 * - if all the others resolve with "drop with warnings," fine, this one wins
 * - otherwise, fail the whole program with an error, on startup, even if they didn't want to use this command.
 * This is the default because the others are opt-in, but you probably don't want to use it on anything dynamically added.
 * @param commandDescription
 */
export function failEverythingInCaseOfConflict(commandDescription: string): ConflictResolution {
    return { kind: "expected to be unique", failEverything: true, commandDescription };
}
/**
 * If more than one of this command appear, drop this one. Put a warning in the help message that this happened.
 * If all of this command resolve with "drop with warnings", none of them will be available.
 * @param commandDescription
 */
export function dropWithWarningsInHelp(commandDescription: string): ConflictResolution {
    return { kind: "drop with warnings", failEverything: false, commandDescription };
}

/**
 * If more than one of this command appear, ask the user to choose between them.
 * The uniqueChoice will distinguish them.
 * If two of the same command with the same uniqueChoice conflict, or if one of the commands insists on failing everything
 * in case of conflict, fallback to drop with warning.
 * @param commandDescription
 * @param choice
 */
export function promptForAChoiceWhenNecessary(commandDescription: string, uniqueChoice: string): ConflictResolution {
    return { kind: "prompt for a choice", commandDescription, uniqueChoice, failEverything: false };
}

export function isPromptForChoice(cr: ConflictResolution): cr is ResolveConflictWithPrompt {
    return cr.kind === "prompt for a choice";
}

export interface YargCommand extends YargBuilder {
    commandName: string;
    description: string;
    conflictResolution: ConflictResolution;
    isRunnable: boolean;
    handleInstructions: HandleInstructions;
    addHelpMessages(s: string[]): void;
}

export function isYargCommand(yc: YargCommand | SupportedSubsetOfYargsCommandMethod): yc is YargCommand {
    return (yc as YargCommand).commandName !== undefined;
}

export interface YargRunnableCommandSpec {
    commandLine: CommandLine;
    description: string;
    handleInstructions: HandleInstructions;
    parameters: CommandLineParameter[];
    positional: PositionalParameter[];
}

export interface PositionalParameter {
    key: string;
    opts: PositionalOptions;
}

export interface SupportedSubsetOfYargsCommandMethod {
    command: string;
    describe: string;
    aliases?: string[] | string;
    builder?: (ys: YargBuilder) => YargBuilder;
    handler?: (argObject: Arguments<any>) => Promise<any>;
    parameters?: CommandLineParameter[]; // bonus; yargs doesn't include this
    positional?: PositionalParameter[];
    /**
     * Specify what to do if this command conflicts with another command built onto the same yargs.
     * The default is to declare an error and exit, so you probably want something different.
     * Construct with:
     * - promptForAChoiceWhenNecessary (recommended)
     * - dropWithWarningsInHelp (polite)
     * - failEverythingInCaseOfConflict (default)
     */
    conflictResolution?: ConflictResolution;
}

// internal
export interface YargCommandWordSpec {
    commandName: string;
    description: string;
    conflictResolution: ConflictResolution;
    runnableCommand?: YargRunnableCommandSpec;
    nestedCommands?: YargCommand[];
    warnings?: string[];
}

export interface Built {
    /**
     * Put everything we know into the real yargs
     * @param  yarg
     */
    save(yarg: yargsArgv): yargsArgv;
    /**
     * Contribution to the description displayed on --help
     */
    helpMessages: string[];
    /**
     * for rolling up descriptions of subcommands
     */
    descriptions: string[];
    /**
     * for sorting
     */
    commandName: string;
}
export interface BuildYargs {
    /**
     * Combine the tree of commands,
     * convert duplicates into warnings.
     * After this, you should only save.
     */
    build(): Built;
}
