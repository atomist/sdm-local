import { logger } from "@atomist/automation-client";
import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import * as _ from "lodash";
import { Argv } from "yargs";
import {
    PathElement,
    toPaths,
} from "../../../util/PathElement";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { logExceptionsToConsole } from "./support/consoleOutput";
import {
    convertToDisplayable,
    runCommandOnRemoteAutomationClient,
} from "./support/runCommandOnRemoteAutomationClient";

/**
 * Add commands by name
 * @param {yargs.Argv} yargs
 * @param {boolean} allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function addCommandsByName(ai: AutomationClientInfo,
                                  yargs: Argv,
                                  allowUserInput: boolean = true) {
    yargs.command("run", "Run a command",
        args => {
            ai.commandsMetadata.forEach(hi => {
                args.command({
                    command: hi.name,
                    handler: async argv => {
                        return logExceptionsToConsole(
                            () => runByCommandName(ai, hi.name, argv), ai.connectionConfig.showErrorStacks);
                    },
                    builder: argv => exposeParameters(hi, argv, allowUserInput),
                });
            });
            return args;
        });
}

/**
 * Add commands for all intents
 * @param {yargs.Argv} yargs
 * @param allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function addIntents(ai: AutomationClientInfo,
                           yargs: Argv, allowUserInput: boolean = true) {
    const handlers = ai.commandsMetadata
        .filter(hm => !!hm.intent && hm.intent.length > 0);

    // Build all words
    const sentences: string[][] =
        _.flatten(handlers.map(hm => hm.intent)).map(words => words.split(" "));
    const paths: PathElement[] = toPaths(sentences);
    paths.forEach(pe => exposeAsCommands(ai, pe, yargs, [], allowUserInput));
}

/**
 * Expose commands for the given path. We expose both the exact
 * case (e.g. "Do Thing now") and the lower case ("do thing now")
 * as it's not feasible to be case insensitive like the Atomist bot.
 * @param {PathElement} pe
 * @param {yargs.Argv} nested
 * @param {string[]} previous
 * @param {boolean} allowUserInput
 */
function exposeAsCommands(ai: AutomationClientInfo,
                          pe: PathElement,
                          nested: Argv,
                          previous: string[],
                          allowUserInput: boolean) {
    const intent = previous.concat([pe.name]).join(" ");
    const commandForCompletedIntent = ai.commandsMetadata.find(hm => hm.intent.includes(intent));

    if (pe.kids.length > 0) {
        // Expose both lower case and actual case name
        const names = _.uniq([pe.name, pe.name.toLowerCase()]);
        names.forEach(name =>
            nested.command(
                name,
                `${name} -> ${pe.kids.map(k => k.name).join("/")}`,
                yargs => {
                    pe.kids.forEach(kid =>
                        exposeAsCommands(ai, kid, yargs, previous.concat(pe.name), allowUserInput));
                    if (!!commandForCompletedIntent) {
                        exposeParameters(commandForCompletedIntent, yargs, allowUserInput);
                    } else {
                        yargs.demandCommand();
                    }
                    return yargs;
                },
                !!commandForCompletedIntent ? async argv => {
                    logger.debug("Args are %j", argv);
                    return logExceptionsToConsole(
                        () => runByIntent(ai, intent, argv as any),
                        ai.connectionConfig.showErrorStacks);
                } : undefined));
    } else {
        const names = _.uniq([pe.name, pe.name.toLowerCase()]);
        names.forEach(name =>
            nested.command({
                command: name,
                describe: commandForCompletedIntent.description,
                handler: async argv => {
                    logger.debug("Args are %j", argv);
                    return logExceptionsToConsole(() => runByIntent(ai, intent, argv),
                        ai.connectionConfig.showErrorStacks);
                },
                builder: yargs => exposeParameters(commandForCompletedIntent, yargs, allowUserInput),
            }));
    }
}

/**
 * Expose the parameters for this command
 * @param {CommandHandlerMetadata} hi
 * @param {yargs.Argv} args
 * @param allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
function exposeParameters(hi: CommandHandlerMetadata, args: Argv, allowUserInput: boolean) {
    hi.parameters
        .forEach(p => {
            const nameToUse = convertToDisplayable(p.name);
            args.option(nameToUse, {
                required: !allowUserInput && p.required && !p.default_value,
            });
        });
    return args;
}

async function runByIntent(ai: AutomationClientInfo,
                           intent: string,
                           command: any): Promise<any> {
    // writeToConsole({ message: `Recognized intent "${intent}"...`, color: "cyan" });
    const hm = ai.commandsMetadata.find(h => !!h.intent && h.intent.includes(intent));
    if (!hm) {
        process.stdout.write(`No command with intent [${intent}]: Known intents are \n${ai.commandsMetadata
            .map(m => "\t" + m.intent).sort().join("\n")}`);
        process.exit(1);
    }
    return runCommandOnRemoteAutomationClient(ai.connectionConfig,
        ai.localConfig.repositoryOwnerParentDirectory,
        hm, command);
}

async function runByCommandName(ai: AutomationClientInfo,
                                name: string,
                                command: any): Promise<any> {
    const hm = ai.commandsMetadata.find(h => h.name === name);
    if (!hm) {
        process.stdout.write(`No command with name [${name}]: Known command names are \n${ai.commandsMetadata
            .map(m => "\t" + m.name).sort().join("\n")}`);
        process.exit(1);
    }
    return runCommandOnRemoteAutomationClient(ai.connectionConfig, ai.localConfig.repositoryOwnerParentDirectory, hm, command);
}
