import { HandleCommand, logger } from "@atomist/automation-client";
import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import * as _ from "lodash";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { PathElement, toPaths } from "../../../util/PathElement";
import { logExceptionsToConsole, writeToConsole } from "../support/consoleOutput";

export function addCommandsByName(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command("run", "Run a command",
        args => {
            sdm.commandsMetadata.forEach(hi => {
                args.command({
                    command: hi.name,
                    handler: async argv => {
                        return logExceptionsToConsole(() => runByCommandName(sdm, hi.name, argv));
                    },
                    builder: argv => exposeParameters(hi, argv),
                });
            });
            return args;
        });
}

export function addIntents(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    const handlers = sdm.commandsMetadata
        .filter(hm => !!hm.intent && hm.intent.length > 0);

    // Build all words
    const sentences: string[][] =
        _.flatten(handlers.map(hm => hm.intent)).map(words => words.split(" "));
    const paths: PathElement[] = toPaths(sentences);
    paths.forEach(pe => exposeAsCommands(sdm, pe, yargs, []));
}

function exposeAsCommands(sdm: LocalSoftwareDeliveryMachine, pe: PathElement, nested: Argv, previous: string[]) {
    const intent = previous.concat([pe.name]).join(" ");
    const hi = sdm.commandsMetadata.find(hm => hm.intent.includes(intent));

    if (pe.kids.length > 0) {
        nested.command(
            pe.name,
            `${pe.name} -> ${pe.kids.map(k => k.name).join("/")}`,
            yargs => {
                pe.kids.forEach(kid => exposeAsCommands(sdm, kid, yargs, previous.concat(pe.name)));
                return yargs;
            },
            !!hi ? async argv => {
                logger.debug("Args are %j", argv);
                return logExceptionsToConsole(() => runByIntent(sdm, intent, argv as any));
            } : undefined);
    } else {
        nested.command({
            command: pe.name,
            describe: hi.description ,
            handler: async argv => {
                logger.debug("Args are %j", argv);
                return logExceptionsToConsole(() => runByIntent(sdm, intent, argv));
            },
            builder: yargs => exposeParameters(hi, yargs),
        });
    }
}

/**
 * Expose the parameters for this command
 * @param {CommandHandlerMetadata} hi
 * @param {yargs.Argv} args
 */
function exposeParameters(hi: CommandHandlerMetadata, args: Argv) {
    const paramsInstance = (hi as any as HandleCommand).freshParametersInstance();
    hi.parameters
        .forEach(p => {
            const nameToUse = p.name.replace(".", "-");
            console.log("EXposing " + p.name)
            args.option(nameToUse, {
                required: p.required && !paramsInstance[p.name],
            });
        });
    return args;
}

async function runByIntent(sdm: LocalSoftwareDeliveryMachine,
                           intent: string,
                           command: any): Promise<any> {
    writeToConsole({ message: `Recognized intent "${intent}"...`, color: "cyan" });
    const hm = sdm.commandsMetadata.find(h => !!h.intent && h.intent.includes(intent));
    if (!hm) {
        writeToConsole(`No command with intent [${intent}]: Known intents are \n${sdm.commandsMetadata
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
        writeToConsole(`No command with name [${name}]: Known command names are \n${sdm.commandsMetadata
            .map(m => "\t" + m.name).sort().join("\n")}`);
        process.exit(1);
    }
    return runCommand(sdm, hm, command);
}

async function runCommand(sdm: LocalSoftwareDeliveryMachine,
                          hm: CommandHandlerMetadata,
                          command: { owner: string, repo: string }): Promise<any> {
    const extraArgs = Object.getOwnPropertyNames(command)
        .map(name => ({ name: name.replace("-", "."), value: command[name] }));
    const args = [
        { name: "github://user_token?scopes=repo,user:email,read:user", value: null },
    ].concat(extraArgs);
    return sdm.executeCommand({ name: hm.name, args });
}
