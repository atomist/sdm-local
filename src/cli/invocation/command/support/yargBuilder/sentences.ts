import {
    ConflictResolution, CommandLineParameter, YargCommand,
    YargCommandSpec, ParameterOptions, YargBuilder
} from "./freshYargBuilder";
import { parseCommandLine, dropFirstWord, CommandLine, verifyOneWord } from "./commandLine";
import * as yargs from "yargs";
import { DoNothing, HandleInstructions, doesSomething, handleFunctionFromInstructions } from "./handleInstruction";
import * as _ from "lodash";
import { combine } from "./combining";

export function yargCommandFromSentence(
    params: {
        command: string,
        describe: string,
        handler: (argObject: any) => Promise<any>,
        parameters: CommandLineParameter[],
        conflictResolution?: ConflictResolution,
    },
): YargCommand {
    return multilevelCommand({
        commandLine: parseCommandLine(params.command),
        description: params.describe,
        handleInstructions: { fn: params.handler },
        parameters: params.parameters,
        conflictResolution: params.conflictResolution || { failEverything: true, commandDescription: params.command },
    });
}


/**
 * Recursively create a command with subcommands for all the words
 * @param params
 */
export function multilevelCommand(params: YargCommandSpec): YargCommandWord {
    const { commandLine } = params;
    if (commandLine.words.length === 1) {
        return buildYargSaverCommand(params);
    } else {
        const nextWord = commandLine.firstWord;
        const rest = dropFirstWord(commandLine);
        /* build the nested commands */
        const inner = multilevelCommand({
            ...params,
            commandLine: rest,
        });

        /* now build the container */
        return buildYargSaverCommand({
            commandLine: parseCommandLine(nextWord),
            description: `...`,
            handleInstructions: DoNothing,
            nestedCommands: [inner],
            conflictResolution: params.conflictResolution,
        });

    }
}


/**
 * This command might be runnable by itself, and might also have subcommands.
 * 
 * It can be constructed whole, or built up yargs-style.
 */
export class YargCommandWord {

    public runnableCommand?: YargCommand = null;
    public readonly nestedCommands: YargCommand[];

    public get helpMessages(): string[] {
        const myHelp = this.finalCommandConfiguration ? this.finalCommandConfiguration.helpMessages : [];
        const descendantHelps = _.flatMap(this.nestedCommands, nc => nc.helpMessages);
        return [...myHelp, ...descendantHelps]
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

    public get commandName() {
        return this.commandLine.firstWord;
    }

    public readonly warnings: string[];

    constructor(public readonly commandLine: CommandLine,
        public readonly description: string,
        public readonly handleInstructions: HandleInstructions,
        readonly opts: {
            conflictResolution: ConflictResolution,
            nestedCommands?: YargCommand[],
            parameters?: CommandLineParameter[],
            warnings?: string[],
        }) {
        this.nestedCommands = opts.nestedCommands;
        this.warnings = opts.warnings || [];
        verifyOneWord(commandLine);
        this.conflictResolution = opts.conflictResolution;
        this.parameters = opts.parameters;
    }

    public get helpMessages(): string[] {
        return [...super.helpMessages, ...this.warnings];
    }

    public withParameter(p: CommandLineParameter) {
        if (!this.isRunnable) {
            this.isRunnable = true;
        }
        this.parameters.push(p);
        return this;
    }

    /**
     * have they typed enough?
     */
    public get isRunnable(): boolean {
        return doesSomething(this.handleInstructions);
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
                    command: self.commandLine.toString(),
                    describe: self.description,
                    builder: y => {
                        nestedCommandSavers.forEach(c => c.save(yarg));
                        if (!self.isRunnable && self.nestedCommands && self.nestedCommands.length > 0) {
                            y.demandCommand();
                            y.recommendCommands();
                        } else {
                            self.finalCommandConfiguration.parameters.forEach(p =>
                                y.option(p.parameterName, p));
                        }
                        y.showHelpOnFail(true);
                        y.epilog(self.helpMessages.join("\n"));
                        return y;
                    },
                    handler: handleFunctionFromInstructions(this.handleInstructions),
                });
                return yarg;
            }
        }
    }

    public get handleInstructions(): HandleInstructions {
        if (this.isRunnable) {
            return this.finalCommandConfiguration.handleInstructions;
        } else {
            return DoNothing;
        }
    }

}


function buildYargSaverCommand(params: YargCommandSpec) {
    const { commandLine, description, handleInstructions,
        configureInner, nestedCommands, parameters, conflictResolution } = params;
    const inner = new YargCommandWord(commandLine, description, handleInstructions,
        { nestedCommands, parameters, conflictResolution });
    if (configureInner) {
        configureInner(inner);
    }
    return inner;
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