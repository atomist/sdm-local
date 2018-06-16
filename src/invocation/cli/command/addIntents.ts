import { HandleCommand, logger } from "@atomist/automation-client";
import * as _ from "lodash";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
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
                return logExceptionsToConsole(() => runIntent(sdm, intent, argv as any));
            } : undefined);
    } else {
        const paramsInstance = (hi as any as HandleCommand).freshParametersInstance();
        const next = nested.command({
            command: pe.name,
            describe: `Start intent ${intent}`,
            handler: async argv => {
                logger.debug("Args are %j", argv);
                return logExceptionsToConsole(() => runIntent(sdm, intent, argv));
            },
        });
        hi.parameters
            .forEach(p => {
                let nameToUse;
                switch (p.name) {
                    case "target.owner":
                        nameToUse = "owner";
                        break;
                    case "target.repo" :
                        nameToUse = "repo";
                        break;
                    default:
                        nameToUse = p.name;
                        break;
                }
                next.option(nameToUse, {
                    required: p.required && !paramsInstance[p.name],
                });
            });
    }
}

async function runIntent(sdm: LocalSoftwareDeliveryMachine,
                         intent: string, command: { owner: string, repo: string }): Promise<any> {
    writeToConsole({ message: `Recognized intent "${intent}"...`, color: "cyan" });
    const hm = sdm.commandsMetadata.find(h => !!h.intent && h.intent.includes(intent));
    if (!hm) {
        writeToConsole(`No command with intent [${intent}]: Known intents are \n${sdm.commandsMetadata
            .map(m => "\t" + m.intent).sort().join("\n")}`);
        process.exit(1);
    }

    const extraArgs = Object.getOwnPropertyNames(command)
        .map(name => ({ name, value: command[name] }));
    const args = [
        { name: "target.owner", value: command.owner },
        { name: "target.repo", value: command.repo },
        { name: "github://user_token?scopes=repo,user:email,read:user", value: null },
    ].concat(extraArgs);
    return sdm.executeCommand({ name: hm.name, args });
}

export interface PathElement {
    name: string;
    kids: PathElement[];
}

export function toPaths(arr: string[][]): PathElement[] {
    if (arr.length === 0) {
        return [];
    }
    const uniq0 = _.uniq(arr.map(a => a[0]));
    return uniq0.map(name => ({
        name,
        kids: toPaths(
            arr.filter(a => a.length > 1 && a[0] === name)
                .map(a => a.slice(1))),
    }));
}
