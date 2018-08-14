import * as _ from "lodash";
import * as yargs from "yargs";
import { combine } from "./combining";
import { commandLineAlias, dropFirstWord, parseCommandLine, verifyOneWord } from "./commandLine";
import { DoNothing, handleFunctionFromInstructions, HandleInstructions, handleInstructionsFromFunction } from "./handleInstruction";
import {
    CommandLineParameter, ConflictResolution, ParameterOptions,
    SupportedSubsetOfYargsCommandMethod, YargBuilder, YargCommand, YargCommandWordSpec, YargRunnableCommandSpec, isYargCommand,
} from "./interfaces";
import { positionalCommand } from "./positional";

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
        this.nestedCommands = spec.nestedCommands || [];
        this.runnableCommand = spec.runnableCommand;
        if (this.runnableCommand) { verifyOneWord(this.runnableCommand.commandLine); }
        this.conflictResolution = spec.conflictResolution;
        this.description = spec.description;
        this.commandName = spec.commandName;
        this.warnings = spec.warnings || [];
        if (spec.runnableCommand && spec.runnableCommand.positional.length > 0) {
            throw new Error("Positional arguments are only ok in a PositionalCommand");
        }
    }

    public withSubcommand(c: YargCommand | SupportedSubsetOfYargsCommandMethod): this {
        if (isYargCommand(c)) {
            this.nestedCommands.push(c);
        } else {
            this.command(c);
        }
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
        const newCommands = imitateYargsCommandMethod(params);
        newCommands.forEach(c => this.nestedCommands.push(c));
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
                commandLine: parseCommandLine(this.commandName),
                description: this.description,
                positional: [],
            };
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

        const descendantHelps = _.flatMap(nestedCommandSavers, nc => nc.helpMessages);
        const helpMessages = [...self.warnings, ...descendantHelps];

        return {
            helpMessages,
            nested: nestedCommandSavers, // the data here is for testing and debugging
            commandName: self.commandName,
            save(yarg: yargs.Argv): yargs.Argv {
                yarg.command({
                    command: self.commandName,
                    describe: self.description,
                    builder: y => {
                        nestedCommandSavers.forEach(c => c.save(yarg));
                        if (!self.runnableCommand && self.nestedCommands.length > 0) {
                            y.demandCommand();
                            y.recommendCommands();
                        }
                        if (!!self.runnableCommand) {
                            self.runnableCommand.parameters.forEach(p =>
                                y.option(p.parameterName, p));
                        }
                        y.showHelpOnFail(true);
                        y.epilog(helpMessages.join("\n"));
                        return y;
                    },
                    handler: self.runnableCommand ?
                        handleFunctionFromInstructions(self.runnableCommand.handleInstructions) : undefined,
                });
                return yarg;
            },
        };
    }

    public get handleInstructions(): HandleInstructions {
        if (!!this.runnableCommand) {
            return this.runnableCommand.handleInstructions;
        } else {
            return DoNothing;
        }
    }

}

export function imitateYargsCommandMethod(params: SupportedSubsetOfYargsCommandMethod) {
    const conflictResolution: ConflictResolution = params.conflictResolution ||
        { failEverything: true, commandDescription: params.command };

    return yargsSpecToMySpecs(params).map(spec =>
        multilevelCommand(spec, params.describe, conflictResolution, params.builder))
}

function yargsSpecToMySpecs(params: SupportedSubsetOfYargsCommandMethod): YargRunnableCommandSpec[] {
    const commandLine = parseCommandLine(params.command);
    const originalSpec: YargRunnableCommandSpec = {
        commandLine,
        description: params.describe,
        handleInstructions: handleInstructionsFromFunction(params.handler),
        parameters: params.parameters || [],
        positional: params.positional || [],
    };
    const aliasSpecs = oneOrMany(params.aliases).map(a => ({
        ...originalSpec,
        commandLine: commandLineAlias(commandLine, a),
    }));
    return [originalSpec, ...aliasSpecs];
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
    configureInner?: (ys: YargBuilder) => YargBuilder): YargCommand {

    const { commandLine } = params;
    if (commandLine.words.length === 1) {
        /* This is the real thing */
        const cmd: YargCommand = commandLine.positionalArguments.length > 0 ?
            positionalCommand(conflictResolution, params)
            : new YargCommandWord({
                commandName: commandLine.firstWord,
                description,
                conflictResolution,
                runnableCommand: params,
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
