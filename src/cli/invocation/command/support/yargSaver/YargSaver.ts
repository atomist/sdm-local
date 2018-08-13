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

import * as stringify from "json-stringify-safe";
import * as _ from "lodash";
import { Choices, Options as ParameterOptions, PositionalOptions, PositionalOptionsType } from "yargs";
import * as yargs from "yargs";
import { combine } from "./combining";
import { CommandLine, commandLineAlias, dropFirstWord, parseCommandLine } from "./commandLine";

export { PositionalOptions, PositionalOptionsType, Choices, ParameterOptions };

/**
 * Build up data about commands, and then put them in yargs later.
 * The YargSaver lets you add lots of commands, including ones with spaces in them.
 * Then optimize it, to combine all the commands optimally.
 * You'll get errors if you've added duplicate commands (they won't overwrite each other).
 *
 * To use it:
 * Get a new one:
 * const yargSaver = freshYargSaver();
 *
 * Add commands to it:
 * yargSaver.withSubcommand(yargCommandFromSentence({ command: "do this thing already", handler: (argv)=> console.log("stuff")}))
 *
 * You can also add positional commands:
 * yargSaver.withSubcommand(yargCommandWithPositionalArguments({ command: "run <thing>", ...}))
 *
 * Then optimize it, and save by passing a real yargs:
 * yargSaver.optimized().save(yargs)
 *
 */
export interface YargSaver {

    withSubcommand(command: YargSaverCommand): YargSaver;
    withParameter(p: CommandLineParameter): YargSaver;
    /*
     * Contribution to the description displayed on --help
     */
    helpMessages: string[];

    // compatibility with Yargs
    option(parameterName: string,
           params: ParameterOptions): YargSaver;
    demandCommand(): void;

    command(params: {
        command: string,
        describe: string,
        aliases?: string,
        builder?: (ys: YargSaver) => (YargSaver | void),
        handler?: (argObject: any) => Promise<any>,
    }): YargSaver;

    save(yarg: yargs.Argv): yargs.Argv;

    /**
     * Construct a YargSaver with duplicate commands combined etc.
     */
    optimized(): YargSaver;
}

export function freshYargSaver(opts: { commandName?: string, epilogForHelpMessage?: string } = {}): YargSaver {
    return new YargSaverTopLevel(opts);
}

export function isYargSaver(ya: yargs.Argv | YargSaver): ya is YargSaver {
    return !!(ya as any).save;
}

export function yargCommandFromSentence(
    params: {
        command: string,
        describe: string,
        handler: (argObject: any) => Promise<any>,
        parameters: CommandLineParameter[],
        conflictResolution?: ConflictResolution,
    },
): YargSaverCommand {
    return multilevelCommand({
        commandLine: parseCommandLine(params.command),
        description: params.describe,
        handleInstructions: { fn: params.handler },
        parameters: params.parameters,
        conflictResolution: params.conflictResolution || { failEverything: true, commandDescription: params.command },
    });
}

export function yargCommandWithPositionalArguments(
    params: {
        command: string,
        describe: string,
        handler: (argObject: any) => Promise<any>,
        parameters?: CommandLineParameter[],
        positional: Array<{ key: string, opts: PositionalOptions }>,
        conflictResolution?: ConflictResolution,
    },
) {
    return new YargSaverPositionalCommand({
        commandLine: parseCommandLine(params.command),
        description: params.describe,
        handleInstructions: { fn: params.handler },
        parameters: params.parameters || [],
        positionalArguments: params.positional,
        conflictResolution: params.conflictResolution || { failEverything: true, commandDescription: params.command },
    });
}

export type CommandLineParameter = ParameterOptions & {
    parameterName: string;
};

export interface ConflictResolution { failEverything: boolean; commandDescription: string; }

// All of the rest of this is exported for interfile use only

type HandleInstructions = RunFunction | DoNothing;

type DoNothing = "do nothing";
export const DoNothing: DoNothing = "do nothing";

interface RunFunction {
    fn: (argObject: object) => Promise<any>;
}

/**
 * Recursively create a command with subcommands for all the words
 * @param params
 */
function multilevelCommand(params: YargSaverCommandSpec): YargSaverCommandWord {
    const { commandLine } = params;
    if (commandLine.words.length === 1) {
        return buildYargSaverCommand(params);
    } else {
        const nextWord = commandLine.firstWord;
        const rest = dropFirstWord(commandLine);
        const inner = multilevelCommand({
            ...params,
            commandLine: rest,
        });

        return buildYargSaverCommand({
            commandLine: parseCommandLine(nextWord),
            description: `...`,
            handleInstructions: DoNothing,
            nestedCommands: [inner],
            conflictResolution: params.conflictResolution,
        });

    }
}

interface YargSaverCommandSpec {
    commandLine: CommandLine;
    description: string;
    handleInstructions: HandleInstructions;
    nestedCommands?: YargSaverCommand[];
    parameters?: CommandLineParameter[];
    configureInner?: (y: YargSaver) => (YargSaver | void);
    conflictResolution: ConflictResolution;
}

function buildYargSaverCommand(params: YargSaverCommandSpec) {
    const { commandLine, description, handleInstructions,
        configureInner, nestedCommands, parameters, conflictResolution } = params;
    const inner = new YargSaverCommandWord(commandLine, description, handleInstructions,
        { nestedCommands, parameters, conflictResolution });
    if (configureInner) {
        configureInner(inner);
    }
    return inner;
}

export interface YargSaverCommand extends YargSaver {
    commandName: string;
    description: string;
    isRunnable: boolean;
    conflictResolution: ConflictResolution;
}

abstract class YargSaverContainer implements YargSaver {
    public commandDemanded: boolean = false;

    public nestedCommands: YargSaverCommand[];

    public parameters: CommandLineParameter[] = [];

    public abstract commandName: string;

    public get helpMessages(): string[] {
        return _.flatMap(this.nestedCommands, nc => nc.helpMessages);
    }

    constructor(nestedCommands: YargSaverCommand[] = [],
                parameters: CommandLineParameter[] = [],
                commandDemanded = false) {
        this.nestedCommands = nestedCommands;
        this.parameters = parameters;
        this.commandDemanded = commandDemanded;
    }

    public withSubcommand(c: YargSaverCommand): this {
        this.nestedCommands.push(c);
        return this;
    }

    public withParameter(p: CommandLineParameter) {
        this.parameters.push(p);
        return this;
    }

    public optimized(): this {
        // assumptions are made: validate has already been called
        const commandsByNames = _.groupBy(this.nestedCommands, nc => nc.commandName);
        const newNestedCommands = Object.entries(commandsByNames).map(([k, v]) =>
            combine(k, v).optimized());
        this.nestedCommands = newNestedCommands as YargSaverCommand[];
        return this;
    }

    public option(parameterName: string,
                  opts: ParameterOptions) {
        this.parameters.push({
            parameterName,
            ...opts,
        });
        return this;
    }
    public demandCommand() {
        this.commandDemanded = true;
    }

    public command(params: {
        command: string,
        describe: string,
        aliases?: string,
        builder?: (ys: YargSaver) => YargSaver,
        handler?: (argObject: any) => Promise<any>,
    }) {
        const commandLine = parseCommandLine(params.command);
        const description = params.describe;
        const configureInner = params.builder;
        const handlerFunction = params.handler;
        const { aliases } = params;
        const handleInstructions = handlerFunction ? { fn: handlerFunction } : DoNothing;
        const spec: YargSaverCommandSpec = {
            commandLine,
            description,
            handleInstructions,
            configureInner,
            conflictResolution: { failEverything: true, commandDescription: params.command },
        };

        let inner: YargSaverCommand;
        if (commandLine.positionalArguments.length > 0) {
            inner = new YargSaverPositionalCommand(spec);
        } else {
            inner = multilevelCommand(spec);
        }
        this.withSubcommand(inner);

        const allAliases = oneOrMany(aliases);
        allAliases.forEach(a => {
            const alternateSpec = {
                ...spec,
                commandLine: commandLineAlias(spec.commandLine, a),
            };
            const extraInner = new YargSaverPositionalCommand(alternateSpec);
            this.withSubcommand(extraInner);
        });
        return this;
    }

    public save(yarg: yargs.Argv): yargs.Argv {
        this.parameters.forEach(p => yarg.option(p.parameterName, p));
        this.nestedCommands.forEach(c => c.save(yarg));
        if (this.commandDemanded) {
            yarg.demandCommand();
        }
        if (this.nestedCommands.length > 0) {
            yarg.recommendCommands();
        }
        yarg.showHelpOnFail(true);
        yarg.epilog(this.helpMessages.join("\n"));
        return yarg;
    }
}

function oneOrMany<T>(t: T | T[] | undefined): T[] {
    return t === undefined ? [] : (Array.isArray(t) ? t : [t]);
}
class YargSaverTopLevel extends YargSaverContainer {
    public commandName: string;
    public epilogsForHelpMessage: string[];
    constructor(opts: { commandName?: string, epilogForHelpMessage?: string }) {
        super();
        this.commandName = opts.commandName || "top-level";
        this.epilogsForHelpMessage = opts.epilogForHelpMessage ? [opts.epilogForHelpMessage] : [];
    }

    public get helpMessages() {
        return [...super.helpMessages, ...this.epilogsForHelpMessage];
    }
}

function verifyOneWord(commandLine: CommandLine) {
    if (commandLine.words.length > 1) {
        throw new Error("You can only have one word if there are positional arguments");
    }
}

function verifyEmpty(arr: any[] | undefined, message: string) {
    if (arr && arr.length > 0) {
        throw new Error(message);
    }
}

// TODO: check in .command() and call this one if it fits
class YargSaverPositionalCommand extends YargSaverContainer implements YargSaverCommand {

    public readonly commandName: string;
    public readonly conflictResolution: ConflictResolution;
    public readonly description: string;
    public handleInstructions: HandleInstructions;
    public readonly opts: {};
    public readonly commandLine: CommandLine;
    public readonly isRunnable = true;

    public readonly positionalArguments: Array<{ key: string, opts: PositionalOptions }>;

    public withSubcommand(): never {
        throw new Error("You cannot have both subcommands and positional arguments");
    }
    constructor(spec: YargSaverCommandSpec & { positionalArguments?: Array<{ key: string, opts: yargs.PositionalOptions }> }) {
        super();
        verifyOneWord(spec.commandLine);
        verifyEmpty(spec.nestedCommands, "You cannot have both subcommands and positional arguments");
        this.commandName = spec.commandLine.firstWord;
        this.commandLine = spec.commandLine;
        this.description = spec.description;
        this.handleInstructions = spec.handleInstructions;
        this.positionalArguments = spec.positionalArguments || [];
        this.conflictResolution = spec.conflictResolution;
    }

    public save(yarg: yargs.Argv): yargs.Argv {
        yarg.command({
            command: this.commandLine.toString(),
            describe: this.description,
            builder: y => {
                super.save(y);
                for (const pa of this.positionalArguments) {
                    y.positional(pa.key, pa.opts);
                }
                return y;
            },
            handler: handleFunctionFromInstructions(this.handleInstructions),
        });
        return yarg;
    }

    public optimized() {
        return this;
    }
}

export function hasPositionalArguments(ys: YargSaverCommand): ys is YargSaverPositionalCommand {
    return (ys as any).commandLine.positionalArguments.length > 0;
}

function doesSomething(hi: HandleInstructions): boolean {
    return hi !== DoNothing;
}
export class YargSaverCommandWord extends YargSaverContainer implements YargSaverCommand {

    public readonly conflictResolution: ConflictResolution;

    public get commandName() {
        return this.commandLine.firstWord;
    }

    public readonly warnings: string[];

    constructor(public readonly commandLine: CommandLine,
                public readonly description: string,
                public readonly handleInstructions: HandleInstructions,
                readonly opts: {
            conflictResolution: ConflictResolution,
            nestedCommands?: YargSaverCommand[],
            parameters?: CommandLineParameter[],
            warnings?: string[],
        }) {
        super(opts.nestedCommands, opts.parameters);
        if (!doesSomething(handleInstructions) && opts.nestedCommands && opts.nestedCommands.length > 0) {
            this.demandCommand(); // do things right
        }
        this.warnings = opts.warnings || [];
        verifyOneWord(commandLine);
        this.conflictResolution = opts.conflictResolution;
    }

    public get helpMessages(): string[] {
        return [...super.helpMessages, ...this.warnings];
    }

    /**
     * have they typed enough?
     */
    public get isRunnable(): boolean {
        return doesSomething(this.handleInstructions) && !this.commandDemanded;
    }

    public save(yarg: yargs.Argv): yargs.Argv {
        yarg.command({
            command: this.commandLine.toString(),
            describe: this.description,
            builder: y => super.save(y),
            handler: handleFunctionFromInstructions(this.handleInstructions),
        });
        return yarg;
    }
}

function handleFunctionFromInstructions(instr: HandleInstructions):
    (argObject: any) => Promise<any> | undefined {
    if (instr === DoNothing) {
        return async args => {
            process.stdout.write("I was told to do nothing. Args: " + stringify(args));
        };
    }
    return instr.fn;
}
