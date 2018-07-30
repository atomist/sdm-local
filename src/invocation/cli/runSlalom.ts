import * as yargs from "yargs";
import { AutomationClientInfo } from "../AutomationClientInfo";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { fetchMetadataFromAutomationClient } from "../http/metadataReader";
import {
    addGitHooksCommand,
    removeGitHooksCommand,
} from "./command/addGitHooksCommands";
import {
    addCommandsByName,
    addIntents,
} from "./command/addIntents";
import { addStartListenerCommand } from "./command/addStartListenerCommand";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addBootstrapCommands } from "./command/bootstrapCommands";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";
import { addShowSkillsCommand } from "./command/showSkillsCommand";

/**
 * Start up the Slalom CLI
 * @return {yargs.Arguments}
 */
export async function runSlalom(connectionConfig: AutomationClientConnectionConfig) {
    yargs.usage("Usage: slalom <command> [options]");

    const automationClientInfo = await fetchMetadataFromAutomationClient(connectionConfig);
    verifyLocalSdm(automationClientInfo);

    addBootstrapCommands(connectionConfig, yargs);

    if (!!automationClientInfo.localConfig) {
        addGitHooksCommand(automationClientInfo, yargs);
        removeGitHooksCommand(automationClientInfo, yargs);
        addImportFromGitRemoteCommand(automationClientInfo, yargs);
    }

    // If we were able to connect to an SDM...
    if (!!automationClientInfo.commandsMetadata) {
        addTriggerCommand(automationClientInfo, yargs);
        addStartListenerCommand(connectionConfig, yargs);
        addCommandsByName(automationClientInfo, yargs);
        addIntents(automationClientInfo, yargs);
        addShowSkillsCommand(automationClientInfo, yargs);
    }

    return yargs
        .epilog("Copyright Atomist 2018")
        .demandCommand(1, `Please provide a command for local SDM ${automationClientInfo.connectionConfig.atomistTeamName} handling projects under ${
            automationClientInfo.localConfig ? automationClientInfo.localConfig.repositoryOwnerParentDirectory : "unknown"}`)
        .help()
        .wrap(100)
        .strict()
        .completion()
        .version()
        .argv;
}

function verifyLocalSdm(automationClientInfo: AutomationClientInfo) {
    if (!!automationClientInfo.commandsMetadata && !automationClientInfo.localConfig) {
        process.stderr.write("ERROR: SDM detected, but it is not running in local mode.\nPlease set ATOMIST_MODE=local when starting your SDM.\n");
        process.exit(1);
    }
}
