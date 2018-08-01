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
import { addAddGitHooksCommand, addRemoveGitHooksCommand } from "./command/addGitHooksCommands";
import { addCommandsByName, addIntents } from "./command/addIntents";
import { addStartListenerCommand } from "./command/addStartListenerCommand";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addBootstrapCommands } from "./command/bootstrapCommands";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";
import { addShowSkillsCommand } from "./command/showSkillsCommand";
import { infoMessage } from "./command/support/consoleOutput";
import { AutomationClientFinder } from "./http/AutomationClientFinder";
import { PortRangeAutomationClientFinder } from "./http/support/PortRangeAutomationClientFinder";

/**
 * Start up the Slalom CLI
 * @return {yargs.Arguments}
 */
export async function addLocalSdmCommands(yargs,
                                          finder: AutomationClientFinder = new PortRangeAutomationClientFinder()) {
    for (const client of await finder.findAutomationClients()) {
        await addCommandsToConnectTo(client, yargs);
    }
}

/**
 * Add commands to command to this automation client
 * @param yargs
 * @return {Promise<void>}
 */
async function addCommandsToConnectTo(client: AutomationClientInfo, yargs) {
    verifyLocalSdm(client);

    // TODO do these all once
    addBootstrapCommands(client.connectionConfig, yargs);
    addRemoveGitHooksCommand(client, yargs);

    if (!!client.localConfig) {
        addAddGitHooksCommand(client, yargs);
        addImportFromGitRemoteCommand(client, yargs);
    }

    // If we were able to connect to an SDM...
    if (!!!!client.client) {
        addTriggerCommand(client, yargs);
        addStartListenerCommand(client.connectionConfig, yargs);
        addCommandsByName(client, yargs);
        addIntents(client, yargs);
        addShowSkillsCommand(client, yargs);
    }
}

function verifyLocalSdm(automationClientInfo: AutomationClientInfo) {
    if (!!automationClientInfo.connectionConfig && !automationClientInfo.localConfig) {
        process.stderr.write("ERROR: SDM detected, but it is not running in local mode.\nPlease set ATOMIST_MODE=local when starting your SDM.\n");
        process.exit(1);
    }
    if (!automationClientInfo.localConfig) {
        // no SDM at all
        infoMessage("Fewer commands will be available\n");
    }
}
