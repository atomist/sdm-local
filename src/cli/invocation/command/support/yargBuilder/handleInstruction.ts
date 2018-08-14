import * as stringify from "json-stringify-safe";
import { Arguments } from "./interfaces";

export type HandleInstructions = RunFunction | DoNothing;

type DoNothing = "do nothing";
export const DoNothing: DoNothing = "do nothing";

interface RunFunction {
    fn: (argObject: Arguments) => Promise<any>;
}

export function doesSomething(hi: HandleInstructions): boolean {
    return hi !== DoNothing;
}

export function handleFunctionFromInstructions(instr: HandleInstructions):
    (argObject: any) => Promise<any> | undefined {
    if (instr === DoNothing) {
        return async args => {
            process.stdout.write("I was told to do nothing. Args: " + stringify(args));
        };
    }
    return instr.fn;
}

export function handleInstructionsFromFunction(fn?: (argObject: Arguments) => any): HandleInstructions {
    if (!fn) {
        return DoNothing;
    }
    return { fn };
}
