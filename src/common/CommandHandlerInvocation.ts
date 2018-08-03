import { InvocationTarget } from "./InvocationTarget";
import { Arg, Secret } from "@atomist/automation-client/internal/invoker/Payload";
import { HandlerResult } from "@atomist/automation-client";

/**
 * Allow params to be expressed in an object for convenience
 */
export interface Params {

    [propName: string]: string | number;
}

export interface CommandHandlerInvocation extends InvocationTarget {
    name: string;
    parameters: Params | Arg[];
    mappedParameters?: Params | Arg[];
    secrets?: Secret[];
}

/**
 * Function that can send a command to an automation client
 */
export type CommandHandlerInvoker = (chi: CommandHandlerInvocation) => Promise<HandlerResult>;