import {
    ConflictResolution, CommandLineParameter, YargCommand,
    YargCommandSpec, YargSaverContainer
} from "./YargBuilder";
import { parseCommandLine, dropFirstWord, CommandLine, verifyOneWord } from "./commandLine";
import * as yargs from "yargs";
import { DoNothing, HandleInstructions, doesSomething, handleFunctionFromInstructions } from "./handleInstruction";

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
export function multilevelCommand(params: YargCommandSpec): YargSaverCommandWord {
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


export class YargSaverCommandWord extends YargSaverContainer implements YargCommand {

    public readonly conflictResolution: ConflictResolution;
    public readonly parameters: CommandLineParameter[] = [];

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
        super(opts.nestedCommands);

        this.warnings = opts.warnings || [];
        verifyOneWord(commandLine);
        this.conflictResolution = opts.conflictResolution;
        this.parameters = opts.parameters;
    }

    public get helpMessages(): string[] {
        return [...super.helpMessages, ...this.warnings];
    }

    public withParameter(p: CommandLineParameter) {
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
        const buildNested = super.build()
        return {
            save(yarg: yargs.Argv): yargs.Argv {
                yarg.command({
                    command: self.commandLine.toString(),
                    describe: self.description,
                    builder: y => {
                        buildNested.save(y);
                        if (!self.isRunnable && self.nestedCommands && self.nestedCommands.length > 0) {
                            yarg.demandCommand();
                            yarg.recommendCommands();
                        }
                        self.parameters.forEach(p =>
                            yarg.option(p.parameterName, p));
                        yarg.showHelpOnFail(true);
                        yarg.epilog(self.helpMessages.join("\n"));
                        return y;
                    },
                    handler: handleFunctionFromInstructions(self.handleInstructions),
                });
                return yarg;
            }
        }
    }
}


function buildYargSaverCommand(params: YargCommandSpec) {
    const { commandLine, description, handleInstructions,
        configureInner, nestedCommands, parameters, conflictResolution } = params;
    const inner = new YargSaverCommandWord(commandLine, description, handleInstructions,
        { nestedCommands, parameters, conflictResolution });
    if (configureInner) {
        configureInner(inner);
    }
    return inner;
}
