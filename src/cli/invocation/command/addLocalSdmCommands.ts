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

import { Argv } from "yargs";
import { DefaultTeamContextResolver } from "../../../common/binding/defaultTeamContextResolver";
import { TeamContextResolver } from "../../../common/binding/TeamContextResolver";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { infoMessage } from "../../ui/consoleOutput";
import { addBootstrapCommands } from "./addBootstrapCommands";
import { addCommandsByName } from "./addCommandsByName";
import { addAddGitHooksCommand, addRemoveGitHooksCommand } from "./addGitHooksCommands";
import { addImportFromGitRemoteCommand } from "./addImportFromGitRemoteCommand";
import { addIntentsAsCommands } from "./addIntentsAsCommands";
import { addListSdmsCommand } from "./addListSdmsCommand";
import { addStartListenerCommand } from "./addStartListenerCommand";
import { addStartSdmDeliveryMachine } from "./addStartSdmDeliveryMachine";
import { addTriggerCommand } from "./addTriggerCommand";
import { addShowSkillsCommand } from "./showSkillsCommand";
import { AutomationClientFinder } from "../http/AutomationClientFinder";
import { defaultAutomationClientFinder } from "../http/support/defaultAutomationClientFinder";

/**
 * Given a yargs instance, add commands based on local SDMs we can connect to
 * @param yargs instance to customize
 * @param finder strategy for finding running automation client instances
 * @return {yargs.Arguments}
 */
export async function addLocalSdmCommands(yargs: Argv,
                                          finder: AutomationClientFinder = defaultAutomationClientFinder()) {
    const teamContextResolver: TeamContextResolver = DefaultTeamContextResolver;

    addBootstrapCommands(yargs);
    addStartSdmDeliveryMachine(yargs);
    addStartListenerCommand(yargs);
    addAddGitHooksCommand(yargs);
    addRemoveGitHooksCommand(yargs);

    addTriggerCommand(yargs, finder, teamContextResolver);

    const clients = await finder.findAutomationClients();

    addListSdmsCommand(clients, yargs);

    // TODO filter on working directories
    for (const client of clients) {
        await addCommandsToConnectTo(client, yargs);
    }
}

/**
 * Add commands to command to this automation client
 * @param yargs
 * @return {Promise<void>}
 */
async function addCommandsToConnectTo(client: AutomationClientInfo, yargs: Argv) {
    verifyLocalSdm(client);

    if (!!client.localConfig) {
        addImportFromGitRemoteCommand(client, yargs);
    }

    // If we were able to connect to an SDM...
    if (!!client.client) {
        addCommandsByName(client, yargs);
        addIntentsAsCommands(client, yargs);
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
