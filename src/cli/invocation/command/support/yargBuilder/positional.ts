import {
    CommandLineParameter,
    PositionalOptions, ConflictResolution,
    YargCommand,
    YargCommandSpec,
    ParameterOptions,
    YargBuilder,
} from "./freshYargBuilder";
import * as yargs from "yargs";
import { parseCommandLine, CommandLine, verifyOneWord } from "./commandLine";
import { handleFunctionFromInstructions, HandleInstructions } from "./handleInstruction";

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

export function positionalCommand(spec: YargCommandSpec): YargCommand {
    return new YargSaverPositionalCommand(spec);
}

// TODO: check in .command() and call this one if it fits
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
    constructor(spec: YargCommandSpec &
    { positionalArguments?: Array<{ key: string, opts: yargs.PositionalOptions }> }) {
        verifyOneWord(spec.commandLine);
        verifyEmpty(spec.nestedCommands, "You cannot have both subcommands and positional arguments");
        this.commandName = spec.commandLine.firstWord;
        this.commandLine = spec.commandLine;
        this.description = spec.description;
        this.handleInstructions = spec.handleInstructions;
        this.positionalArguments = spec.positionalArguments || [];
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
            }
        };

    }
}


export function hasPositionalArguments(ys: YargCommand): ys is YargSaverPositionalCommand {
    return (ys as any).commandLine.positionalArguments.length > 0;
}


function verifyEmpty(arr: any[] | undefined, message: string) {
    if (arr && arr.length > 0) {
        throw new Error(message);
    }
}
