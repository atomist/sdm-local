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

import * as yargs from "yargs";
import { CommandLine, parseCommandLine, verifyOneWord } from "./commandLine";
import { handleFunctionFromInstructions, HandleInstructions } from "./handleInstruction";
import {
    CommandLineParameter,
    ConflictResolution,
    ParameterOptions,
    PositionalOptions,
    YargBuilder,
    YargCommand,
    YargRunnableCommandSpec,
} from "./interfaces";

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
        positional: params.positional,
        conflictResolution: params.conflictResolution || { failEverything: true, commandDescription: params.command },
    });
}

export function positionalCommand(conflictResolution: ConflictResolution, spec: YargRunnableCommandSpec) {
    return new YargSaverPositionalCommand({ ...spec, conflictResolution });
}

// TODO: check in multilevelCommand and call this one if it fits
class YargSaverPositionalCommand implements YargCommand {

    public readonly parameters: CommandLineParameter[] = [];

    public readonly commandName: string;
    public readonly conflictResolution: ConflictResolution;
    public readonly description: string;
    public readonly handleInstructions: HandleInstructions;
    public readonly commandLine: CommandLine;
    public readonly isRunnable = true;

    public readonly positionalArguments: Array<{ key: string, opts: PositionalOptions }>;
    public readonly helpMessages: string[] = [];

    public get contributorName() { return this.commandName; }

    public withSubcommand(): never {
        throw new Error("You cannot have both subcommands and positional arguments");
    }
    constructor(spec: YargRunnableCommandSpec &
    { conflictResolution: ConflictResolution }) {
        verifyOneWord(spec.commandLine);
        this.commandName = spec.commandLine.firstWord;
        this.commandLine = spec.commandLine;
        this.description = spec.description;
        this.handleInstructions = spec.handleInstructions;
        this.positionalArguments = spec.positional || [];
        this.conflictResolution = spec.conflictResolution;
        this.parameters = spec.parameters;
    }

    public withParameter(p: CommandLineParameter) {
        this.parameters.push(p);
        return this;
    }

    public option(parameterName: string,
                  opts: ParameterOptions): YargBuilder {
        this.withParameter({
            parameterName,
            ...opts,
        });
        return this;
    }

    public demandCommand(): YargBuilder {
        throw new Error("Commands with positional arguments may not have subcommands");
    }

    public command(): YargBuilder {
        throw new Error("Commands with positional arguments may not have subcommands");
    }

    public build() {
        const ypc = this; // mutating this object will screw this up. Conceptually, should copy
        return {
            helpMessages: ypc.helpMessages,
            commandName: ypc.commandName,
            descriptions: [ypc.description],
            save(yarg: yargs.Argv): yargs.Argv {
                yarg.command({
                    command: ypc.commandLine.toString(),
                    describe: ypc.description,
                    handler: handleFunctionFromInstructions(ypc.handleInstructions),
                    builder: y => {
                        ypc.parameters.forEach(p => yarg.option(p.parameterName, p));
                        for (const pa of ypc.positionalArguments) {
                            y.positional(pa.key, pa.opts);
                        }
                        yarg.showHelpOnFail(true);
                        return y;
                    },
                });
                return yarg;
            },
        };

    }
}

export function hasPositionalArguments(ys: YargCommand): ys is YargSaverPositionalCommand {
    return !!(ys as any).positionalArguments;
}
