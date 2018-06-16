import { logger } from "@atomist/automation-client";
import { Arg } from "@atomist/automation-client/internal/transport/RequestProcessor";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole } from "../support/consoleOutput";
import * as _ from "lodash";

export function addIntents(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    const intents: string[] = _.flatten(sdm.commandsMetadata
        .filter(hm => !!hm.intent)
        .map(hi => hi.intent));
    intents.forEach(intent => {
        yargs.command({
            command: intent,
            describe: "Run intent",
            handler: argv => {
                logger.debug("Args are %j", argv);
                const command = Object.getOwnPropertyNames(argv)
                    .map(name => ({ name, value: argv[name] }));
                return logExceptionsToConsole(() => runIntent(sdm, intent, command));
            },
        });
    });
}

async function runIntent(sdm: LocalSoftwareDeliveryMachine, intent: string, args: Arg[]): Promise<any> {
    const hm = sdm.commandsMetadata.find(h => !!h.intent && h.intent.includes(intent));
    if (!hm) {
        logger.error(`No command with intent [${intent}]: Known commands are [${sdm.commandsMetadata.map(m => m.name)}]`);
        process.exit(1);
    }
    return sdm.executeCommand({ name: hm.name, args });
}
