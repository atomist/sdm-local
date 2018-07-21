import * as yargs from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../machine/LocalSoftwareDeliveryMachine";
import { addGitHooksCommands } from "./command/addGitHooksCommands";
import { addCommandsByName, addIntents } from "./command/addIntents";
import { addStartListener } from "./command/addStartListener";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";
import { addShowSkills } from "./command/showSkills";
import { getMetadata } from "../http/metadataReader";
import { AutomationClientConnectionConfig, DefaultConfig } from "../config";

/**
 * Start up the Slalom CLI
 * @return {yargs.Arguments}
 */
export async function runSlalom(localSdmInstance: LocalSoftwareDeliveryMachine,
                                config: AutomationClientConnectionConfig = DefaultConfig) {
    yargs.usage("Usage: slalom <command> [options]");

    const automationClientInfo = await getMetadata(config);

    addTriggerCommand(automationClientInfo, yargs);
    addStartListener(localSdmInstance, yargs);
    addGitHooksCommands(localSdmInstance, yargs);
    addCommandsByName(automationClientInfo, yargs);
    addIntents(automationClientInfo, yargs);
    addImportFromGitRemoteCommand(localSdmInstance, yargs);
    addShowSkills(localSdmInstance, yargs);

    return yargs
        .epilog("Copyright Atomist 2018")
        .demandCommand(1, `Please provide a command for local SDM ${localSdmInstance.name} handling projects under ${
            localSdmInstance.configuration.repositoryOwnerParentDirectory}`)
        .help()
        .wrap(100)
        .strict()
        .completion()
        .version()
        .argv;
}
