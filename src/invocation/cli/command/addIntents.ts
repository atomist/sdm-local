import { HandleCommand, logger } from "@atomist/automation-client";
import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import * as _ from "lodash";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { PathElement, toPaths } from "../../../util/PathElement";
import { logExceptionsToConsole, writeToConsole } from "../support/consoleOutput";

export function addListIntents(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "list-intents",
        describe: `List intents`,
        handler: async argv => {
            writeToConsole("Intents are:\n");
            sdm.commandsMetadata.forEach(hm => {
                writeToConsole({ message: "\t" + hm.intent, color: "cyan" });
            });
        },
    });
}

export function addCommandsByName(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    const commandNames = sdm.commandsMetadata
        .map(h => h.name);
    yargs.command("run", "Run a command",
        args => {
            commandNames.forEach(command => args.command({
                command,
                handler: async argv => {
                    return logExceptionsToConsole(() => runByCommandName(sdm, command, argv));
                },
            }));
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
            `Start intent ${pe.name}`,
            yargs => {
                pe.kids.forEach(kid => exposeAsCommands(sdm, kid, yargs, previous.concat(pe.name)));
                return yargs;
            },
            !!hi ? async argv => {
                logger.debug("Args are %j", argv);
                return logExceptionsToConsole(() => runByIntent(sdm, intent, argv as any));
            } : undefined);
    } else {
        const paramsInstance = (hi as any as HandleCommand).freshParametersInstance();
        const next = nested.command({
            command: pe.name,
            describe: `Start intent ${intent}`,
            handler: async argv => {
                logger.debug("Args are %j", argv);
                return logExceptionsToConsole(() => runByIntent(sdm, intent, argv));
            },
        });
        hi.parameters
            .forEach(p => {
                const nameToUse = p.name.replace(".", "-");
                next.option(nameToUse, {
                    required: p.required && !paramsInstance[p.name],
                });
            });
    }
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
