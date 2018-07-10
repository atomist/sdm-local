import * as yargs from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../machine/LocalSoftwareDeliveryMachine";
import { addGitHooksCommands } from "./command/addGitHooksCommands";
import { addCommandsByName, addIntents } from "./command/addIntents";
import { addStartListener } from "./command/addStartListener";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";
import { addShowSkills } from "./command/showSkills";

export function runSlalom(localSdmInstance: LocalSoftwareDeliveryMachine) {

    yargs.usage("Usage: slalom <command> [options]");

    addTriggerCommand(localSdmInstance, yargs);
    addStartListener(localSdmInstance, yargs);
    addGitHooksCommands(localSdmInstance, yargs);
    addCommandsByName(localSdmInstance, yargs);
    addIntents(localSdmInstance, yargs);
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
