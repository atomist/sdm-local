import { HandleCommand, logger } from "@atomist/automation-client";
import { CommandHandlerMetadata, Parameter } from "@atomist/automation-client/metadata/automationMetadata";
import * as _ from "lodash";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { PathElement, toPaths } from "../../../util/PathElement";
import { infoMessage, logExceptionsToConsole } from "../support/consoleOutput";

import { Arg } from "@atomist/automation-client/internal/invoker/Payload";
import * as inquirer from "inquirer";

/**
 *
 * @param {LocalSoftwareDeliveryMachine} sdm
 * @param {yargs.Argv} yargs
 * @param {boolean} allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function addCommandsByName(sdm: LocalSoftwareDeliveryMachine, yargs: Argv, allowUserInput: boolean = true) {
    yargs.command("run", "Run a command",
        args => {
            sdm.commandsMetadata.forEach(hi => {
                args.command({
                    command: hi.name,
                    handler: async argv => {
                        return logExceptionsToConsole(() => runByCommandName(sdm, hi.name, argv), sdm.configuration.showErrorStacks);
                    },
                    builder: argv => exposeParameters(hi, argv, allowUserInput),
                });
            });
            return args;
        });
}

/**
 *
 * @param {LocalSoftwareDeliveryMachine} sdm
 * @param {yargs.Argv} yargs
 * @param allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function addIntents(sdm: LocalSoftwareDeliveryMachine, yargs: Argv, allowUserInput: boolean = true) {
    const handlers = sdm.commandsMetadata
        .filter(hm => !!hm.intent && hm.intent.length > 0);

    // Build all words
    const sentences: string[][] =
        _.flatten(handlers.map(hm => hm.intent)).map(words => words.split(" "));
    const paths: PathElement[] = toPaths(sentences);
    paths.forEach(pe => exposeAsCommands(sdm, pe, yargs, [], allowUserInput));
}

function exposeAsCommands(sdm: LocalSoftwareDeliveryMachine, pe: PathElement, nested: Argv, previous: string[],
                          allowUserInput: boolean) {
    const intent = previous.concat([pe.name]).join(" ");
    const hi = sdm.commandsMetadata.find(hm => hm.intent.includes(intent));

    if (pe.kids.length > 0) {
        nested.command(
            pe.name,
            `${pe.name} -> ${pe.kids.map(k => k.name).join("/")}`,
            yargs => {
                pe.kids.forEach(kid => exposeAsCommands(sdm, kid, yargs, previous.concat(pe.name), allowUserInput));
                if (!!hi) {
                    exposeParameters(hi, yargs, allowUserInput);
                }
                return yargs;
            },
            !!hi ? async argv => {
                logger.debug("Args are %j", argv);
                return logExceptionsToConsole(() => runByIntent(sdm, intent, argv as any), sdm.configuration.showErrorStacks);
            } : undefined);
    } else {
        nested.command({
            command: pe.name,
            describe: hi.description,
            handler: async argv => {
                logger.debug("Args are %j", argv);
                return logExceptionsToConsole(() => runByIntent(sdm, intent, argv), sdm.configuration.showErrorStacks);
            },
            builder: yargs => exposeParameters(hi, yargs, allowUserInput),
        });
    }
}

/**
 * Expose the parameters for this command
 * @param {CommandHandlerMetadata} hi
 * @param {yargs.Argv} args
 * @param allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
function exposeParameters(hi: CommandHandlerMetadata, args: Argv, allowUserInput: boolean) {
    const paramsInstance = (hi as any as HandleCommand).freshParametersInstance();
    hi.parameters
        .forEach(p => {
            const nameToUse = convertToDisplayable(p.name);
            args.option(nameToUse, {
                required: !allowUserInput && p.required && !paramsInstance[p.name],
            });
        });
    return args;
}

async function runByIntent(sdm: LocalSoftwareDeliveryMachine,
                           intent: string,
                           command: any): Promise<any> {
    // writeToConsole({ message: `Recognized intent "${intent}"...`, color: "cyan" });
    const hm = sdm.commandsMetadata.find(h => !!h.intent && h.intent.includes(intent));
    if (!hm) {
        process.stdout.write(`No command with intent [${intent}]: Known intents are \n${sdm.commandsMetadata
            .map(m => "\t" + m.intent).sort().join("\n")}`);
        process.exit(1);
    }
    return runCommand(sdm, hm, command);
}

async function runByCommandName(sdm: LocalSoftwareDeliveryMachine,
                                name: string,
                                command: any): Promise<any> {
    const hm = sdm.commandsMetadata.find(h => h.name === name);
    if (!hm) {
        process.stdout.write(`No command with name [${name}]: Known command names are \n${sdm.commandsMetadata
            .map(m => "\t" + m.name).sort().join("\n")}`);
        process.exit(1);
    }
    return runCommand(sdm, hm, command);
}

async function runCommand(sdm: LocalSoftwareDeliveryMachine,
                          hm: CommandHandlerMetadata,
                          command: { owner: string, repo: string }): Promise<any> {
    const extraArgs = Object.getOwnPropertyNames(command)
        .map(name => ({ name: convertToUsable(name), value: command[name] }));
    const args = [
        { name: "github://user_token?scopes=repo,user:email,read:user", value: null },
    ]
        .concat(extraArgs);
    await promptForMissingParameters(hm, args);
    // infoMessage(`Using arguments:\n${args.map(a => `\t${a.name}=${a.value}`).join("\n")}\n`);
    return sdm.executeCommand({ name: hm.name, args });
}

/**
 * Gather missing parameters from the command line
 * @param {CommandHandlerMetadata} hi
 * @param args Args we've already found
 * @return {object}
 */
async function promptForMissingParameters(hi: CommandHandlerMetadata, args: Arg[]): Promise<void> {
    function mustBeSupplied(p: Parameter) {
        return p.required; // && (args.find(a => a.name === p.name) === undefined || args.find(a => a.name === p.name).value === undefined);
    }

    const questions =
        hi.parameters
            .filter(mustBeSupplied)
            .map(p => {
                const nameToUse = convertToDisplayable(p.name);
                return {
                    name: nameToUse,
                    default: p.default_value,
                    message: p.description,
                    validate: value => {
                        const pass = !p.pattern || value.match(new RegExp(p.pattern));
                        if (pass) {
                            return true;
                        }
                        return `Please enter a valid ${nameToUse} - ${p.valid_input}`;
                    },
                };
            });
    const fromPrompt = await inquirer.prompt(questions);
    Object.getOwnPropertyNames(fromPrompt)
        .forEach(enteredName => {
            // Replace any existing argument with this name that yargs has
            _.remove(args, arg => arg.name === enteredName);
            args.push({ name: convertToUsable(enteredName), value: fromPrompt[enteredName] });
        });
}

function convertToDisplayable(name: string): string {
    const display = name.replace(".", "-");
    return display;
}

function convertToUsable(entered: string): string {
    return entered.replace("-", ".");
}
