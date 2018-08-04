import { Arg } from "@atomist/automation-client/internal/invoker/Payload";
import { isArray } from "util";

export function propertiesToArgs(o: any): Arg[] {
    if (isArray(o)) {
        return o;
    }
    const args = Object.keys(o).map(k => ({ name: k, value: o[k] }));
    return args;
}
