import { logger } from "@atomist/automation-client";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole, writeToConsole } from "../support/consoleOutput";
import * as _ from "lodash";

export function addListIntents(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "list-intents",
        describe: `List intents`,
        handler: async argv => {
            writeToConsole("Intents are:\n");
            sdm.commandsMetadata.forEach(hm => {
                writeToConsole({ message: "\t" + hm.intent, color: "cyan"});
            });
        },
    });
}

export function addIntents(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    const handlers = sdm.commandsMetadata
        .filter(hm => !!hm.intent && hm.intent.length > 0);
    // TODO what about >1 intent
    handlers.forEach(hi => {
        const intent = hi.intent[0];
        console.log("Adding intent " + intent);
        yargs.command({
            command: "do",
            describe: `Run intent erer`,
            handler: async argv => {
                logger.debug("Args are %j", argv);
                return logExceptionsToConsole(() => runIntent(sdm, argv.intent.join(" "), argv));
            },
        }).option("intent", {
            type: "array",
        });
        hi.parameters
            .filter(p => p.required)
            .forEach(p => {
                yargs.option(p.name, {});
            })
    });
}

async function runIntent(sdm: LocalSoftwareDeliveryMachine,
                         intent: string, command: { owner: string, repo: string }): Promise<any> {
    console.log(`runIntent [${intent}]`);
    const hm = sdm.commandsMetadata.find(h => !!h.intent && h.intent.includes(intent));
    if (!hm) {
        writeToConsole(`No command with intent [${intent}]: Known intents are \n${sdm.commandsMetadata
            .map(m => "\t" + m.intent).sort().join("\n")}`);
        process.exit(1);
    }

    // const missingParams = hm.parameters.filter(p => p.required && !p.default_value && !command[p.name]);
    // if (missingParams.length > 0) {
    //     throw new Error(`Missing parameters: ${hm.parameters.map(p => p.name)}`);
    // }
    const extraArgs = Object.getOwnPropertyNames(command)
        .map(name => ({ name, value: command[name] }));
    const args = [
        { name: "target.owner", value: command.owner },
        { name: "target.repo", value: command.repo },
        { name: "github://user_token?scopes=repo,user:email,read:user", value: null },
    ].concat(extraArgs);
    return sdm.executeCommand({ name: hm.name, args });
}
