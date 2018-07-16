import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole } from "../support/consoleOutput";

import chalk from "chalk";

export function addShowSkills(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "show skills",
        aliases: "s",
        describe: "Show skills",
        handler: () => {
            return logExceptionsToConsole(async () => {
                const commands = sdm.commandsMetadata;
                commands.forEach(md => {
                    let msg = "\t" + chalk.cyan(md.intent.map(intent => `"${intent}"`).join(","));
                    msg += "\t" + chalk.green(md.name);
                    msg += "\t" + chalk.gray(md.description);
                    process.stdout.write(msg + "\n");
                });
            }, sdm.configuration.showErrorStacks);
        },
    });
}
