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

import * as _ from "lodash";
import { Choices, Options as ParameterOptions, PositionalOptions, PositionalOptionsType } from "yargs";
import * as yargs from "yargs";
import { combine } from "./combining";
import { CommandLine, commandLineAlias, parseCommandLine } from "./commandLine";
import { multilevelCommand } from "./sentences";
import { positionalCommand } from "./positional";
import { HandleInstructions, DoNothing } from './handleInstruction';

export { PositionalOptions, PositionalOptionsType, Choices, ParameterOptions };

interface BuildYargs {
    /**
     * Combine the tree of commands, 
     * convert duplicates into warnings.
     * After this, you should only save.
     */
    build(): {
        /**
        * Put everything we know into the real yargs
        * @param  yarg 
        */
        save(yarg: yargs.Argv): yargs.Argv;
    };
}
/**
 * Build up data about commands, and then put them in yargs later.
 * The YargBuilder lets you add lots of commands, including ones with spaces in them.
 * Then optimize it, to combine all the commands optimally.
 * You'll get errors if you've added duplicate commands (they won't overwrite each other).
 *
 * To use it:
 * Get a new one:
 * const yargBuilder = freshYargSaver();
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

    withSubcommand(command: YargCommand): void;
    withParameter(p: CommandLineParameter): void;
    /*
     * Contribution to the description displayed on --help
     */
    helpMessages: string[];

    // compatibility with Yargs
    /**
    * This exists to be compatible with yargs syntax
    * once we aren't using it, we could remove it
    * @param params 
    * @deprecated
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
     * @deprecated
     */
    command(params: {
        command: string,
        describe: string,
        aliases?: string,
        builder?: (ys: YargBuilder) => (YargBuilder | void),
        handler?: (argObject: any) => Promise<any>,
    }): YargBuilder;
}

export interface YargContributor extends BuildYargs {
    helpMessages: string[];
}

export function freshYargBuilder(opts: { commandName?: string, epilogForHelpMessage?: string } = {}): YargBuilder {
    return new YargSaverTopLevel(opts);
}

export function isYargBuilder(ya: yargs.Argv | YargBuilder): ya is YargBuilder {
    return !!(ya as YargBuilder).build;
}

export type CommandLineParameter = ParameterOptions & {
    parameterName: string;
};

export interface ConflictResolution { failEverything: boolean; commandDescription: string; }

// All of the rest of this is exported for interfile use only


export interface YargCommandSpec {
    commandLine: CommandLine;
    description: string;
    handleInstructions: HandleInstructions;
    nestedCommands?: YargCommand[];
    parameters?: CommandLineParameter[];
    configureInner?: (y: YargBuilder) => (YargBuilder | void);
    conflictResolution: ConflictResolution;
}


/**
 * A command is expandible in yargs, so you have to be able
 * to build on it here. Implementations that don't allow subcommands
 * can throw exceptions.
 */
export interface YargCommand extends YargBuilder {
    commandName: string;
    description: string;
    isRunnable: boolean;
    conflictResolution: ConflictResolution;
}

export abstract class YargSaverContainer implements YargBuilder {

    public nestedCommands: YargCommand[];

    public get helpMessages(): string[] {
        return _.flatMap(this.nestedCommands, nc => nc.helpMessages);
    };

    constructor(nestedCommands: YargCommand[] = []) {
        this.nestedCommands = nestedCommands;
    }

    public withSubcommand(c: YargCommand): this {
        this.nestedCommands.push(c);
        return this;
    }

    public withParameter(p: CommandLineParameter) {
        throw new Error("Unimplemented on this type: withParameter");
    }

    public build() {
        const commandsByNames = _.groupBy(this.nestedCommands, nc => nc.commandName);
        const nestedCommandSavers = Object.entries(commandsByNames).map(([k, v]) =>
            combine(k, v).build());
        return {
            save(yarg: yargs.Argv): yargs.Argv {
                nestedCommandSavers.forEach(c => c.save(yarg));
                return yarg;
            }
        };
    }

    public option(parameterName: string,
        opts: ParameterOptions): YargBuilder {
        this.withParameter({
            parameterName,
            ...opts,
        });
        return this;
    }

    public demandCommand() {
        // no-op. Only here for compatibility with yargs syntax,
        // during conversion.
        return this;
    }

    public command(params: {
        command: string,
        describe: string,
        aliases?: string,
        builder?: (ys: YargBuilder) => YargBuilder,
        handler?: (argObject: any) => Promise<any>,
    }) {
        const commandLine = parseCommandLine(params.command);
        const description = params.describe;
        const configureInner = params.builder;
        const handlerFunction = params.handler;
        const { aliases } = params;
        const handleInstructions = handlerFunction ? { fn: handlerFunction } : DoNothing;
        const spec: YargCommandSpec = {
            commandLine,
            description,
            handleInstructions,
            configureInner,
            conflictResolution: { failEverything: true, commandDescription: params.command },
        };

        let constructCommand = commandFactory(commandLine);
        this.withSubcommand(constructCommand(spec));

        const allAliases = oneOrMany(aliases);
        allAliases.forEach(a => {
            const alternateSpec = {
                ...spec,
                commandLine: commandLineAlias(spec.commandLine, a),
            };
            this.withSubcommand(constructCommand(alternateSpec));
        });
        return this;
    }

}

function commandFactory(commandLine: CommandLine): (y: YargCommandSpec) => YargCommand {
    // note: "show skills <thing>" is still not gonna parse correctly;
    // that one should be multilevel and then positional
    if (commandLine.positionalArguments.length > 0) {
        return positionalCommand;
    } else {
        return multilevelCommand;
    }
}

function oneOrMany<T>(t: T | T[] | undefined): T[] {
    return t === undefined ? [] : (Array.isArray(t) ? t : [t]);
}
class YargSaverTopLevel extends YargSaverContainer implements YargBuilder {
    public commandName: string;
    public epilogsForHelpMessage: string[];
    constructor(opts: { commandName?: string, epilogForHelpMessage?: string }) {
        super();
        this.commandName = opts.commandName || "top-level";
        this.epilogsForHelpMessage = opts.epilogForHelpMessage ? [opts.epilogForHelpMessage] : []
    }

    public get helpMessages() {
        return [...super.helpMessages, ...this.epilogsForHelpMessage];
    }
}
