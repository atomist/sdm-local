import * as yargs from "yargs";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { getMetadata } from "../http/metadataReader";
import { addGitHooksCommands } from "./command/addGitHooksCommands";
import { addCommandsByName, addIntents } from "./command/addIntents";
import { addStartListenerCommand } from "./command/addStartListenerCommand";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";
import { addShowSkillsCommand } from "./command/showSkillsCommand";

/**
 * Start up the Slalom CLI
 * @return {yargs.Arguments}
 */
export async function runSlalom(config: AutomationClientConnectionConfig) {
    yargs.usage("Usage: slalom <command> [options]");

    const automationClientInfo = await getMetadata(config);

    addTriggerCommand(automationClientInfo, yargs);
    addStartListenerCommand(automationClientInfo, yargs);
    addGitHooksCommands(automationClientInfo, yargs);
    addCommandsByName(automationClientInfo, yargs);
    addIntents(automationClientInfo, yargs);
    addImportFromGitRemoteCommand(automationClientInfo, yargs);
    addShowSkillsCommand(automationClientInfo, yargs);

    return yargs
        .epilog("Copyright Atomist 2018")
        .demandCommand(1, `Please provide a command for local SDM ${automationClientInfo.connectionConfig.atomistTeamName} handling projects under ${
            automationClientInfo.localConfig.repositoryOwnerParentDirectory}`)
        .help()
        .wrap(100)
        .strict()
        .completion()
        .version()
        .argv;
}
