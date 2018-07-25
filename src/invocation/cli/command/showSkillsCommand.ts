import { Argv } from "yargs";
import { logExceptionsToConsole } from "../support/consoleOutput";

import chalk from "chalk";
import { AutomationClientInfo } from "../../AutomationClientInfo";

export function addShowSkillsCommand(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "show skills",
        aliases: "s",
        describe: "Show skills",
        handler: () => {
            return logExceptionsToConsole(async () => {
                const commands = ai.commandsMetadata;
                commands.forEach(md => {
                    let msg = "\t" + chalk.cyan(md.intent.map(intent => `"${intent}"`).join(","));
                    msg += "\t" + chalk.green(md.name);
                    msg += "\t" + chalk.gray(md.description);
                    process.stdout.write(msg + "\n");
                });
            }, ai.connectionConfig.showErrorStacks);
        },
    });
}
