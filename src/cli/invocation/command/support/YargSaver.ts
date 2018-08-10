import { PositionalOptions, Choices, PositionalOptionsType, Options as ParameterOptions } from "yargs";
import * as yargs from "yargs";
import * as _ from "lodash";
import { parseCommandLine, CommandLine, dropFirstWord, commandLineAlias } from "./yargSaver/commandLine";
import * as stringify from "json-stringify-safe";

export { PositionalOptions, PositionalOptionsType, Choices, ParameterOptions };

export function freshYargSaver(): YargSaver {
    return new YargSaverTopLevel();
}

export function yargCommandFromSentence(
    params: {
        command: string,
        describe: string,
        handler: (argObject: any) => Promise<any>,
        parameters: CommandLineParameter[]
    }
): YargSaverCommand {
    return multilevelCommand({
        commandLine: parseCommandLine(params.command),
        description: params.describe,
        handleInstructions: { fn: params.handler },
        parameters: params.parameters,
    })
}

export function yargCommandWithPositionalArguments(
    params: {
        command: string,
        describe: string,
        handler: (argObject: any) => Promise<any>,
        parameters?: CommandLineParameter[],
        positional: Array<{ key: string, opts: PositionalOptions }>
    }
) {
    return new YargSaverPositionalCommand({
        commandLine: parseCommandLine(params.command),
        description: params.describe,
        handleInstructions: { fn: params.handler },
        parameters: params.parameters || [],
        positionalArguments: params.positional,
    })
}

export interface YargSaver {

    withSubcommand(command: YargSaverCommand): YargSaver;
    withParameter(p: CommandLineParameter): YargSaver;

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
    }): void;

    save(yarg: yargs.Argv): yargs.Argv;

    /**
     * Construct a YargSaver with duplicate commands combined etc.
     */
    optimized(): YargSaver;

    validate(): ValidationError[];
}


export function optimizeOrThrow(yargSaver: YargSaver): YargSaver {
    const problems = yargSaver.validate();
    if (problems.length > 0) {
        throw new Error("The collected commands are invalid: " + problems.map(errorToString).join("\n"));
    }
    return yargSaver.optimized();
}

type HandleInstructions = RunFunction | DoNothing;

type DoNothing = "do nothing";
const DoNothing: DoNothing = "do nothing";

interface RunFunction {
    fn: (argObject: object) => Promise<any>;
}
export type CommandLineParameter = ParameterOptions & {
    parameterName: string;
}

interface ValidationError {
    complaint: string;
    /*
     * command names that this is nested within
     */
    contexts: string[];
}

function errorToString(ve: ValidationError): string {
    const prefix = ve.contexts.length > 0 ?
        ve.contexts.join(" -> ") + ": " : ""
    return prefix + ve.complaint;
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
        })

    }
}


interface YargSaverCommandSpec {
    commandLine: CommandLine;
    description: string,
    handleInstructions: HandleInstructions,
    nestedCommands?: YargSaverCommand[],
    parameters?: CommandLineParameter[],
    configureInner?: (y: YargSaver) => (YargSaver | void),
}

function buildYargSaverCommand(params: YargSaverCommandSpec) {
    const { commandLine, description, handleInstructions, configureInner, nestedCommands, parameters } = params;
    const inner = new YargSaverCommandWord(commandLine, description, handleInstructions,
        { nestedCommands, parameters });
    if (configureInner) {
        configureInner(inner);
    }
    return inner;
}

interface YargSaverCommand extends YargSaver {
    commandName: string;
    description: string;
    isRunnable: boolean;
}

abstract class YargSaverContainer implements YargSaver {
    public commandDemanded: boolean = false;

    public nestedCommands: YargSaverCommand[];

    public parameters: CommandLineParameter[] = [];

    public abstract commandName: string;

    constructor(nestedCommands: YargSaverCommand[] = [], parameters: CommandLineParameter[] = [], commandDemanded = false) {
        this.nestedCommands = nestedCommands;
        this.parameters = parameters;
        this.commandDemanded = false;
    }

    public withSubcommand(c: YargSaverCommand): this {
        this.nestedCommands.push(c);
        return this;
    }

    public withParameter(p: CommandLineParameter) {
        this.parameters.push(p);
        return this;
    }

    public validate(): ValidationError[] {

        const nestedErrors = _.flatMap(this.nestedCommands, nc => nc.validate())

        const duplicateNameErrors = this.validateCanCombineChildren();

        const allErrors = [...nestedErrors, ...duplicateNameErrors]
            .map(putInContext(this.commandName))

        return allErrors;
    }

    public validateCanCombineChildren(): ValidationError[] {
        const commandsByNames = _.groupBy(this.nestedCommands, nc => nc.commandName)
        const duplicateNameProblems: ValidationError[] = _.flatten(Object.entries(commandsByNames)
            .filter(([k, v]) => v.length > 1)
            .map(([k, v]) => whyNotCombine(v).map(putInContext(k))));
        return duplicateNameProblems;
    }

    public optimized(): this {
        // assumptions are made: validate has already been called
        const commandsByNames = _.groupBy(this.nestedCommands, nc => nc.commandName)
        const newNestedCommands = Object.entries(commandsByNames).map(([k, v]) =>
            combine(v).optimized());
        this.nestedCommands = newNestedCommands;
        return this;
    }

    public option(parameterName: string,
        opts: ParameterOptions) {
        this.parameters.push({
            parameterName,
            ...opts
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
        };

        let inner: YargSaverCommand;
        if (commandLine.positionalArguments.length > 0) {
            inner = new YargSaverPositionalCommand(spec);
        } else {
            inner = multilevelCommand(spec);
        }
        this.withSubcommand(inner);

        const allAliases = oneOrMany(aliases)
        allAliases.forEach(a => {
            const alternateSpec = {
                ...spec,
                commandLine: commandLineAlias(spec.commandLine, a),
            }
            const extraInner = new YargSaverPositionalCommand(alternateSpec);
            this.withSubcommand(extraInner);
        })
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
        return yarg;
    }
}

function oneOrMany<T>(t: T | T[] | undefined): T[] {
    return t === undefined ? [] : (Array.isArray(t) ? t : [t]);
}
class YargSaverTopLevel extends YargSaverContainer {
    public commandName: string;
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
        verifyEmpty(spec.nestedCommands, "You cannot have both subcommands and positional arguments")
        this.commandName = spec.commandLine.firstWord;
        this.commandLine = spec.commandLine;
        this.description = spec.description;
        this.handleInstructions = spec.handleInstructions;
        this.positionalArguments = spec.positionalArguments || []
    }

    public save(yarg: yargs.Argv): yargs.Argv {
        this.parameters.forEach(p => yarg.option(p.parameterName, p));
        this.nestedCommands.forEach(c => c.save(yarg));
        if (this.commandDemanded) {
            yarg.demandCommand();
        }
        for (const pa of this.positionalArguments) {
            yarg.positional(pa.key, pa.opts);
        }
        return yarg;
    }

    public validate(): ValidationError[] {
        return [];
    }

    public optimized() {
        return this;
    }
}

function doesSomething(hi: HandleInstructions): boolean {
    return hi !== DoNothing;
}
class YargSaverCommandWord extends YargSaverContainer implements YargSaverCommand {

    public get commandName() {
        return this.commandLine.firstWord;
    }

    constructor(public readonly commandLine: CommandLine,
        public readonly description: string,
        public handleInstructions: HandleInstructions,
        public readonly opts: {
            nestedCommands?: YargSaverCommand[],
            parameters?: CommandLineParameter[],
        } = {}) {
        super(opts.nestedCommands, opts.parameters);
        if (!doesSomething(handleInstructions) && opts.nestedCommands && opts.nestedCommands.length > 0) {
            this.demandCommand(); // do things right
        }
        verifyOneWord(commandLine);
    }

    /** 
     * have they typed enough?
     */
    public get isRunnable(): boolean {
        return doesSomething(this.handleInstructions) && !this.commandDemanded
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

    public validate(): ValidationError[] {
        return [...super.validate(), ...this.validateRunningness()]
    }

    private validateRunningness(): ValidationError[] {
        if (doesSomething(this.handleInstructions) && !this.commandDemanded) {
            return [] // ok. does something
        }
        if (!doesSomething(this.handleInstructions) && this.commandDemanded && this.parameters.length === 0) {
            return [] // ok. does nothing
        }
        return [{
            complaint: `Does it want to do something or not? Handler says ${
                doesSomething(this.handleInstructions)}; demandCommand says ${
                !this.commandDemanded}; parameters says ${this.parameters.length > 0}`, contexts: []
        }]
    }

}

function putInContext(additionalContext: string) {
    return (ve: ValidationError) => ({
        complaint: ve.complaint,
        contexts: [additionalContext, ...ve.contexts],
    })
}

function handleFunctionFromInstructions(instr: HandleInstructions):
    (argObject: any) => Promise<any> | undefined {
    if (instr === DoNothing) {
        return async (args) => {
            process.stdout.write("I was told to do nothing. Args: " + stringify(args))
        };
    }
    return instr.fn;
}

function hasPositionalArguments(ys: YargSaverCommand): ys is YargSaverPositionalCommand {
    return (ys as any).commandLine.positionalArguments.length > 0;
}

function whyNotCombine(yss: YargSaverCommand[]): ValidationError[] {
    const commonName = yss[0].commandName;
    const reasons: ValidationError[] = [];
    if (yss.some(hasPositionalArguments)) {
        reasons.push({ complaint: "Cannot combine commands with positional arguments", contexts: [commonName] });
    }
    const yscws = yss as Array<YargSaverCommandWord | YargSaverPositionalCommand>;
    const completeCommands = yscws.filter(ys => !ys.demandCommand);
    if (completeCommands.length > 1) {
        reasons.push({
            complaint: "There are two complete commands. Descriptions: " + completeCommands.map(c => c.description).join("; "),
            contexts: [commonName]
        });
    }
    const meaningfulInstructions = yscws.filter(ys => ys.isRunnable);
    if (meaningfulInstructions.length > 1) {
        reasons.push({
            complaint: "There are two functions to respond to",
            contexts: [commonName],
        })
    }

    return reasons;
}

function combine(yss: YargSaverCommand[]) {
    // assumption: whyNotCombine has been called, so several things are guaranteed
    const yswcs = yss as Array<YargSaverCommandWord>;
    const one = yswcs[0];

    const realCommand = yswcs.find(ys => ys.isRunnable) || {
        handleInstructions: DoNothing,
        parameters: [] as CommandLineParameter[],
    };

    return new YargSaverCommandWord(one.commandLine,
        _.uniq(yswcs.map(y => y.description)).join("; or, "),
        realCommand.handleInstructions,
        {
            nestedCommands: _.flatMap(yswcs.map(ys => ys.nestedCommands)),
            parameters: realCommand.parameters,
        }
    )

}
