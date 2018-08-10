import * as yargs from "yargs";

export function freshYargSaver(): YargSaver {
    return new YargSaverTopLevel();
}

export function validateOrThrow(yargSaver: YargSaver) {
    const result = yargSaver.validate();
    if (result !== "OK") {
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

export interface YargSaver {
    option(parameterName: string,
        params: { required: boolean }): void;
    demandCommand(): void;

    command(params: {
        command: string,
        describe: string,
        aliases?: string,
        builder?: (ys: YargSaver) => YargSaver,
        handler?: (argObject: any) => Promise<any>,
    }): void;

    save(yarg: yargs.Argv): yargs.Argv;

    validate(): "OK" | string[];
}

abstract class YargSaverContainer implements YargSaver {
    public commandDemanded: boolean = false;

    public nestedCommands: YargSaver[] = [];

    public parameters: CommandLineParameter[] = [];

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
        const name = params.command;
        const description = params.describe;
        const configureInner = params.builder;
        const handlerFunction = params.handler;
        const { aliases } = params;

        const handleInstructions = handlerFunction ? { fn: handlerFunction } : DoNothing;
        const inner = new YargSaverCommand(name, description, handleInstructions, { aliases });
        if (configureInner) {
            configureInner(inner);
        }
        this.nestedCommands.push(inner);
    }

    public save(yarg: yargs.Argv): yargs.Argv {
        this.parameters.forEach(p => yarg.option(p.parameterName, p));
        this.nestedCommands.forEach(c => c.save(yarg));
        if (this.commandDemanded) {
            yarg.demandCommand();
        }
        return yarg;
    }

    public validate(): "OK" {
        return "OK";
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
}

function handleFunctionFromInstructions(instr: HandleInstructions):
    (argObject: any) => Promise<any> | undefined {
    if (instr === DoNothing) {
        return undefined;
    }
    return instr.fn;
}
