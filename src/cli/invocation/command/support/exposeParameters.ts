import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { Argv } from "yargs";
import { convertToDisplayable } from "./runCommandOnCollocatedAutomationClient";

/**
 * Expose the parameters for this command
 * @param {CommandHandlerMetadata} hi
 * @param {yargs.Argv} args
 * @param allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function exposeParameters(hi: CommandHandlerMetadata, args: Argv, allowUserInput: boolean) {
    hi.parameters
        .forEach(p => {
            const nameToUse = convertToDisplayable(p.name);
            args.option(nameToUse, {
                required: !allowUserInput && p.required && !p.default_value,
            });
        });
    return args;
}
