import { logger } from "@atomist/automation-client";
import { Arg } from "@atomist/automation-client/internal/transport/RequestProcessor";
import { GeneratorTag } from "@atomist/sdm/api-helper/machine/commandRegistrations";
import { commandHandlersWithTag } from "@atomist/sdm/pack/info/support/commandSearch";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole } from "../support/consoleOutput";

export function addGenerateCommand(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "generate <generator>",
        aliases: ["g"],
        builder: {
            owner: {
                required: true,
            },
            repo: {
                required: true,
            },
        },
        describe: "Generate",
        handler: argv => {
            logger.debug("Args are %j", argv);
            const extraArgs = Object.getOwnPropertyNames(argv)
                .map(name => ({ name, value: argv[name] }));
            return logExceptionsToConsole(() => generateCommand(sdm, argv.generator, argv.owner, argv.repo, extraArgs));
        },
    });
}

async function generateCommand(sdm: LocalSoftwareDeliveryMachine,
                               commandName: string, targetOwner: string, targetRepo: string,
                               extraArgs: Arg[]): Promise<any> {
    const hm = sdm.commandMetadata(commandName);
    if (!hm || !!hm.tags && !hm.tags.some(t => t.name === GeneratorTag)) {
        logger.error(`No generator with name [${commandName}]: Known generators are [${
            commandHandlersWithTag(sdm, GeneratorTag).map(m => m.instance.name)}]`);
        process.exit(1);
    }
    const args = [
        { name: "target.owner", value: targetOwner },
        { name: "target.repo", value: targetRepo },
    ].concat(extraArgs);

    return sdm.executeCommand({ name: commandName, args });
}
