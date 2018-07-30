/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as yargs from "yargs";
import { AutomationClientInfo } from "../AutomationClientInfo";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { fetchMetadataFromAutomationClient } from "../http/metadataReader";
import {
    addAddGitHooksCommand,
    addRemoveGitHooksCommand,
} from "./command/addGitHooksCommands";
import {
    addCommandsByName,
    addIntents,
} from "./command/addIntents";
import { addStartListenerCommand } from "./command/addStartListenerCommand";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addBootstrapCommands } from "./command/bootstrapCommands";
import { addClientCommands } from "./command/clientCommands";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";
import { addShowSkillsCommand } from "./command/showSkillsCommand";
import { readVersion } from "./command/support/commands";

/**
 * Start up the Slalom CLI
 * @param connectionConfig if this is supplied, try to connect to a remote SDM
 * @return {yargs.Arguments}
 */
export async function runSlalom(connectionConfig?: AutomationClientConnectionConfig) {
    yargs.usage("Usage: slalom <command> [options]");

    addClientCommands(yargs);

    if (!!connectionConfig) {
        const automationClientInfo = await fetchMetadataFromAutomationClient(connectionConfig);
        verifyLocalSdm(automationClientInfo);

        addBootstrapCommands(connectionConfig, yargs);

        addRemoveGitHooksCommand(automationClientInfo, yargs);

        if (!!automationClientInfo.localConfig) {
            addAddGitHooksCommand(automationClientInfo, yargs);
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
    }

    return yargs
        .epilog("Copyright Atomist 2018")
        .demandCommand(1, "Please provide a command")
        .help()
        .wrap(100)
        .strict()
        .completion()
        .alias("help", ["h", "?"])
        .version(readVersion())
        .alias("version", "v")
        .argv;
}

function verifyLocalSdm(automationClientInfo: AutomationClientInfo) {
    if (!!automationClientInfo.commandsMetadata && !automationClientInfo.localConfig) {
        process.stderr.write("ERROR: SDM detected, but it is not running in local mode.\nPlease set ATOMIST_MODE=local when starting your SDM.\n");
        process.exit(1);
    }
}
