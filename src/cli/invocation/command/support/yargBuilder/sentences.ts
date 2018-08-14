import {
    ConflictResolution, CommandLineParameter, YargCommand,
    YargRunnableCommandSpec, ParameterOptions, YargBuilder, YargCommandWordSpec, SupportedSubsetOfYargsCommandMethod
} from "./interfaces";
import { parseCommandLine, dropFirstWord, CommandLine, verifyOneWord, commandLineAlias } from "./commandLine";
import * as yargs from "yargs";
import { DoNothing, HandleInstructions, handleFunctionFromInstructions, handleInstructionsFromFunction } from "./handleInstruction";
import * as _ from "lodash";
import { combine } from "./combining";
import { positionalCommand } from "./positional";

export function yargCommandFromSentence(
    params: {
        command: string,
        describe: string,
        handler: (argObject: any) => Promise<any>,
        parameters: CommandLineParameter[],
        conflictResolution?: ConflictResolution,
    },
): YargCommand {
    const conflictResolution = params.conflictResolution || { failEverything: true, commandDescription: params.command }
    return multilevelCommand({
        commandLine: parseCommandLine(params.command),
        description: params.describe,
        handleInstructions: { fn: params.handler },
        parameters: params.parameters,
        helpMessages: [],
    }, params.describe, conflictResolution);
}



/**
 * This command might be runnable by itself, and might also have subcommands.
 * 
 * It can be constructed whole, or built up yargs-style.
 */
export class YargCommandWord implements YargCommand {

    public runnableCommand?: YargRunnableCommandSpec = null;
    public readonly nestedCommands: YargCommand[];

    public readonly conflictResolution: ConflictResolution;
    public readonly description: string;
    public readonly commandName: string;
    public readonly warnings: string[];


    constructor(spec: YargCommandWordSpec) {
        this.nestedCommands = spec.nestedCommands;
        this.runnableCommand = spec.runnableCommand;
        if (this.runnableCommand) { verifyOneWord(this.runnableCommand.commandLine) };
        this.conflictResolution = spec.conflictResolution;
        this.description = spec.description;
        this.commandName = spec.commandName;
        this.warnings = spec.warnings || [];
    }

    public get helpMessages(): string[] {
        const myHelp = this.runnableCommand ? this.runnableCommand.helpMessages : [];
        const descendantHelps = _.flatMap(this.nestedCommands, nc => nc.helpMessages);
        return [...this.warnings, ...myHelp, ...descendantHelps];
    };

    public withSubcommand(c: YargCommand): this {
        this.nestedCommands.push(c);
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

    public demandCommand() {
        // no-op. Only here for compatibility with yargs syntax.
        // We can figure out whether to demand a command.
        return this;
    }

    public command(params: SupportedSubsetOfYargsCommandMethod): this {
        imitateYargsCommandMethod(this, params);
        return this;
    }

    public withParameter(p: CommandLineParameter) {
        this.beRunnable();
        this.runnableCommand.parameters.push(p);
        return this;
    }

    public beRunnable() {
        if (!this.runnableCommand) {
            this.runnableCommand = {
                handleInstructions: DoNothing,
                parameters: [],
                helpMessages: [],
                commandLine: parseCommandLine(this.commandName),
                description: this.description,
            }
        }
    }

    /**
     * have they typed enough?
     */
    public get isRunnable(): boolean {
        return !!this.runnableCommand;
    }

    public build() {
        const self = this;
        const commandsByNames = _.groupBy(this.nestedCommands, nc => nc.commandName);
        const nestedCommandSavers = Object.entries(commandsByNames).map(([k, v]) =>
            combine(k, v).build());
        return {
            save(yarg: yargs.Argv): yargs.Argv {
                return yarg;
            }
        };
        return {
            save(yarg: yargs.Argv): yargs.Argv {
                yarg.command({
                    command: self.commandName,
                    describe: self.description,
                    builder: y => {
                        nestedCommandSavers.forEach(c => c.save(yarg));
                        if (!self.runnableCommand && self.nestedCommands && self.nestedCommands.length > 0) {
                            y.demandCommand();
                            y.recommendCommands();
                        }
                        if (!!self.runnableCommand) {
                            self.runnableCommand.parameters.forEach(p =>
                                y.option(p.parameterName, p));
                        }
                        y.showHelpOnFail(true);
                        y.epilog(self.helpMessages.join("\n"));
                        return y;
                    },
                    handler: self.runnableCommand ?
                        handleFunctionFromInstructions(self.runnableCommand.handleInstructions) : undefined,
                });
                return yarg;
            }
        }
    }

    public get handleInstructions(): HandleInstructions {
        if (!!this.runnableCommand) {
            return this.runnableCommand.handleInstructions;
        } else {
            return DoNothing;
        }
    }

}

export function imitateYargsCommandMethod(self: YargBuilder, params: SupportedSubsetOfYargsCommandMethod) {
    const commandLine = parseCommandLine(params.command);
    const spec: YargRunnableCommandSpec = {
        commandLine,
        description: params.describe,
        handleInstructions: handleInstructionsFromFunction(params.handler),
        parameters: [],
        helpMessages: []
    };
    const conflictResolution: ConflictResolution = { failEverything: true, commandDescription: params.command };
    const constructCommand = commandFactory(commandLine, conflictResolution, params.describe, params.builder);

    self.withSubcommand(constructCommand(spec));

    const allAliases = oneOrMany(params.aliases);
    allAliases.forEach(a => {
        const alternateSpec = {
            ...spec,
            commandLine: commandLineAlias(spec.commandLine, a),
        };
        self.withSubcommand(constructCommand(alternateSpec));
    });
}

function commandFactory(commandLine: CommandLine, conflictResolution: ConflictResolution, description: string,
    configureInner?: (ys: YargBuilder) => YargBuilder): (y: YargRunnableCommandSpec) => YargCommand {
    // note: "show skills <thing>" is still not gonna parse correctly;
    // that one should be multilevel and then positional
    if (commandLine.positionalArguments.length > 0) {
        return (spec) => {
            const pc = positionalCommand(conflictResolution)(spec);
            if (configureInner) { configureInner(pc); }
            return pc;
        }
    } else {
        return (spec) => multilevelCommand(spec, description, conflictResolution, configureInner);
    }
}

function oneOrMany<T>(t: T | T[] | undefined): T[] {
    return t === undefined ? [] : (Array.isArray(t) ? t : [t]);
}


/**
 * Recursively create a command with subcommands for all the words
 * @param params
 */
function multilevelCommand(params: YargRunnableCommandSpec,
    description: string,
    conflictResolution: ConflictResolution,
    configureInner?: (ys: YargBuilder) => YargBuilder): YargCommandWord {

    const { commandLine } = params;
    if (commandLine.words.length === 1) {
        /* This is the real thing */
        const cmd = new YargCommandWord({
            commandName: commandLine.firstWord,
            description,
            conflictResolution,
            runnableCommand: params
        });
        if (configureInner) {
            configureInner(cmd);
        }
        return cmd;
    } else {
        const nextWord = commandLine.firstWord;
        const rest = dropFirstWord(commandLine);
        /* build the nested commands */
        const inner = multilevelCommand({
            ...params,
            commandLine: rest,
        }, description, conflictResolution, configureInner);

        /* now build the container */
        return new YargCommandWord({
            commandName: nextWord,
            description: "...",
            conflictResolution,
            nestedCommands: [inner],
        });

    }
}
