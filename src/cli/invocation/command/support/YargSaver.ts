import * as yargs from "yargs";
import * as _ from "lodash";

export function freshYargSaver(): YargSaver {
    return new YargSaverTopLevel();
}

export function validateOrThrow(yargSaver: YargSaver) {
    const result = yargSaver.validate();
    if (result.length > 0) {
        throw new Error("The collected commands are invalid: " + result.join("\n"));
    }
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

export function multilevelCommand(params: YargSaverCommandSpec): YargSaverCommand {
    const words = params.commandName.split(" ");
    if (words.length === 1) {
        return buildYargSaverCommand(params);
    } else {
        if (params.opts.aliases) {
            throw new Error("Aliases are not gonna work for a command with spaces in it: " + params.commandName)
        }
        const inner = multilevelCommand({
            ...params,
            commandName: words.slice(1).join(" ")
        });

        return buildYargSaverCommand({
            commandName: params.commandName,
            description: "part of " + params.description,
            handleInstructions: DoNothing,
            opts: {
                aliases: undefined,
                configureInner: ys => ys.withSubcommand(inner)
            }
        })

    }
}

export interface YargSaver {

    withSubcommand(command: YargSaverCommand): YargSaver;

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

    validate(): ValidationError[];
}

interface YargSaverCommandSpec {
    commandName: string;
    description: string,
    handleInstructions: HandleInstructions,
    opts: {
        aliases: string,
        configureInner: (y: YargSaver) => (YargSaver | void)
    }
}

function buildYargSaverCommand(params: YargSaverCommandSpec) {
    const { commandName, description, handleInstructions, opts: { aliases, configureInner } } = params;
    const inner = new YargSaverCommand(commandName, description, handleInstructions, { aliases });
    if (configureInner) {
        configureInner(inner);
    }
    return inner;
}
abstract class YargSaverContainer implements YargSaver {
    public commandDemanded: boolean = false;

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
        const commandName = params.command;
        const description = params.describe;
        const configureInner = params.builder;
        const handlerFunction = params.handler;
        const { aliases } = params;

        const handleInstructions = handlerFunction ? { fn: handlerFunction } : DoNothing;

        const inner = multilevelCommand({
            commandName,
            description,
            handleInstructions,
            opts: { configureInner, aliases }
        });
        this.withSubcommand(inner);
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
        const duplicateNameErrors = duplicateNames.map((([k, v]) => `Duplicate command ${k}. Descriptions: ${v.map(vv => vv.description)}`))
        return duplicateNameErrors.map(complaint => ({ complaint, contexts: [] }));
    }
}

function validateName(name: string) {
    if (name.includes(" ")) {
        throw new Error("Commands must be broken into one word at a time. This is not OK: `" + name + "`");
    }
}

class YargSaverTopLevel extends YargSaverContainer {

}

class YargSaverCommand extends YargSaverContainer {

    constructor(public readonly commandName: string,
        public readonly description: string,
        public handleInstructions: HandleInstructions,
        public readonly opts: { aliases?: string } = {}) {
        super();
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
        return undefined;
    }
    return instr.fn;
}
