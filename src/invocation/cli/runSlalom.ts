import * as yargs from "yargs";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { getMetadata } from "../http/metadataReader";
import { addGitHooksCommands } from "./command/addGitHooksCommands";
import { addCommandsByName, addIntents } from "./command/addIntents";
import { addStartListener } from "./command/addStartListener";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";
import { addShowSkills } from "./command/showSkills";
import { infoMessage } from "./support/consoleOutput";
import { IpcServer } from "./support/IpcServer";

/**
 * Start up the Slalom CLI
 * @return {yargs.Arguments}
 */
export async function runSlalom(config: AutomationClientConnectionConfig) {

    yargs.usage("Usage: slalom <command> [options]");

    const ipcServer = new IpcServer(async msg => process.stdout.write(msg));

    infoMessage(`Connecting to Automation client at %s\n`, config.baseEndpoint);
    const automationClientInfo = await getMetadata(config);

    addTriggerCommand(automationClientInfo, yargs);
    addStartListener(automationClientInfo, yargs);
    addGitHooksCommands(automationClientInfo, yargs);
    addCommandsByName(automationClientInfo, yargs);
    addIntents(automationClientInfo, yargs);
    addImportFromGitRemoteCommand(automationClientInfo, yargs);
    addShowSkills(automationClientInfo, yargs);

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
