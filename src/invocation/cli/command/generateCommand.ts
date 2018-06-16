import { logger } from "@atomist/automation-client";
import { Arg } from "@atomist/automation-client/internal/transport/RequestProcessor";
import { GeneratorTag } from "@atomist/sdm/api-helper/machine/commandRegistrations";
import { commandHandlersWithTag } from "@atomist/sdm/pack/info/support/commandSearch";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole, writeToConsole } from "../support/consoleOutput";

export function addGenerateCommand(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "generate <name> <owner> <repo>",
        aliases: ["g"],
        describe: "Generate",
        handler: argv => {
            logger.debug("Args are %j", argv);
            return logExceptionsToConsole(() => generateCommand(sdm, argv));
        },
    });
}

export async function generateCommand(sdm: LocalSoftwareDeliveryMachine,
                                      command: { name: string, owner: string, repo: string }): Promise<any> {
    const hm = sdm.commandMetadata(command.name);
    if (!hm || !!hm.tags && !hm.tags.some(t => t.name === GeneratorTag)) {
        writeToConsole(`No generator with name [${command.name}]: Known generators are [${
            commandHandlersWithTag(sdm, GeneratorTag).map(m => m.instance.name)}]`);
        process.exit(1);
    }
    const extraArgs = Object.getOwnPropertyNames(command)
        .map(name => ({ name, value: command[name] }));
    const args = [
        { name: "target.owner", value: command.owner },
        { name: "target.repo", value: command.repo },
        { name: "github://user_token?scopes=repo,user:email,read:user", value: null },
    ].concat(extraArgs);

    return sdm.executeCommand({ name: command.name, args });
}
