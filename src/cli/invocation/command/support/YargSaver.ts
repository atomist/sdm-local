import * as yargs from "yargs";
import * as _ from "lodash";
import { parseCommandLine, CommandLine, dropFirstWord, commandLineAlias } from "./yargSaver/commandLine";
import * as stringify from "json-stringify-safe";

export function freshYargSaver(): YargSaver {
    return new YargSaverTopLevel();
}

export function optimizeOrThrow(yargSaver: YargSaver): YargSaver {
    const result = yargSaver.optimized();
    if (Array.isArray(result)) {
        throw new Error("The collected commands are invalid: " + result.map(errorToString).join("\n"));
    }
    return result;
}

type HandleInstructions = RunFunction | DoNothing;

type DoNothing = "do nothing";
const DoNothing: DoNothing = "do nothing";

interface RunFunction {
    fn: (argObject: object) => Promise<any>;
}
interface CommandLineParameter {
    parameterName: string;
    required: boolean;
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
        ve.contexts.join(" ") + ": " : ""
    return prefix + ve.complaint;
}



export function multilevelCommand(params: YargSaverCommandSpec): YargSaverCommandWord {
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
            description: `${nextWord} -> ${rest}`,
            handleInstructions: DoNothing,
            opts: { // todo: specify subcommand directly instead of a configure function
                configureInner: ys => ys.withSubcommand(inner)
            }
        })

    }
}

export interface YargSaver {

    withSubcommand(command: YargSaverCommandWord): YargSaver;

    // compatibility with Yargs
    option(parameterName: string,
        params: { required: boolean }): void;
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
    optimized(): YargSaver | ValidationError[];

    validate(): ValidationError[];
}

interface YargSaverCommandSpec {
    commandLine: CommandLine;
    description: string,
    handleInstructions: HandleInstructions,
    opts: {
        configureInner: (y: YargSaver) => (YargSaver | void)
    }
}

function buildYargSaverCommand(params: YargSaverCommandSpec) {
    const { commandLine, description, handleInstructions, opts: { configureInner } } = params;
    const inner = new YargSaverCommandWord(commandLine, description, handleInstructions, {});
    if (configureInner) {
        configureInner(inner);
    }
    return inner;
}

interface YargSaverCommand extends YargSaver {
    commandName: string;
    description: string;
}
abstract class YargSaverContainer implements YargSaver {
    public commandDemanded: boolean = false;

    // TODO: this might also be a positional-arg command
    public nestedCommands: YargSaverCommand[] = [];

    public parameters: CommandLineParameter[] = [];

    public withSubcommand(c: YargSaverCommand): this {
        this.nestedCommands.push(c);
        return this;
    }

    public option(parameterName: string,
        params: { required: boolean }) {
        this.parameters.push({
            parameterName,
            required: params.required,
        });
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
        const spec = {
            commandLine,
            description,
            handleInstructions,
            opts: { configureInner }
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
        return yarg;
    }

    public validate(): ValidationError[] {
        const commandsByNames = _.groupBy(this.nestedCommands, nc => nc.commandName)
        const duplicateNames = Object.entries(commandsByNames).filter(([k, v]) => v.length > 1);
        const duplicateNameErrors = duplicateNames.map((([k, v]) =>
            `Duplicate command ${k}. Descriptions: ${v.map(vv => vv.description).join("; ")}`))
        return duplicateNameErrors.map(complaint => ({ complaint, contexts: [] }));
    }

    public optimized(): YargSaver | ValidationError[] {
        return this.validate();
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

// TODO: check in .command() and call this one if it fits
class YargSaverPositionalCommand extends YargSaverContainer implements YargSaverCommand {

    public readonly commandName: string;
    public readonly description: string;
    public handleInstructions: HandleInstructions;
    public readonly opts: {};
    public readonly commandLine: CommandLine;

    public withSubcommand(): never {
        throw new Error("You cannot have both subcommands and positional arguments");
    }
    constructor(spec: YargSaverCommandSpec) {
        super();
        verifyOneWord(spec.commandLine);
        this.commandName = spec.commandLine.firstWord;
        this.commandLine = spec.commandLine;
        this.description = spec.description;
        this.handleInstructions = spec.handleInstructions;
    }

    public save(yarg: yargs.Argv): yargs.Argv {
        // TODO: I need to use commandLine for the name of the command
        // how does that work?
        this.parameters.forEach(p => yarg.option(p.parameterName, p));
        this.nestedCommands.forEach(c => c.save(yarg));
        if (this.commandDemanded) {
            yarg.demandCommand();
        }
        return yarg;
    }
}


class YargSaverCommandWord extends YargSaverContainer {

    public get commandName() {
        return this.commandLine.firstWord;
    }

    constructor(public readonly commandLine: CommandLine,
        public readonly description: string,
        public handleInstructions: HandleInstructions,
        public readonly opts: {} = {}) {
        super();
        verifyOneWord(commandLine);
    }

    public save(yarg: yargs.Argv): yargs.Argv {
        yarg.command({
            ...this.opts,
            command: this.commandName,
            describe: this.description,
            builder: y => super.save(y),
            handler: handleFunctionFromInstructions(this.handleInstructions),
        });
        return yarg;
    }

    public validate(): ValidationError[] {

        const myContext = this.commandName;

        const nestedErrors = _.flatMap(this.nestedCommands, nc => nc.validate())

        const duplicateNameErrors = super.validate();

        const allErrors = [...nestedErrors, ...duplicateNameErrors]
            .map(ve => ({
                complaint: ve.complaint,
                contexts: [myContext, ...ve.contexts],
            }))

        return allErrors;
    }
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
