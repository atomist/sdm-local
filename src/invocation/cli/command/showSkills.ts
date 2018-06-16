import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole, writeToConsole } from "../support/consoleOutput";

export function addShowSkills(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "show skills",
        aliases: "s",
        describe: "Show skills",
        handler: argv => {
            return logExceptionsToConsole(async () => {
                const commands = sdm.commandsMetadata;
                commands.forEach(md => {
                    writeToConsole({message: `\t${md.name}`, color: "cyan"});
                });
            });
        },
    });
}
