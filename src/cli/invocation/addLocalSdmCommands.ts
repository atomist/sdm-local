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
import { AutomationClientConnectionConfig } from "./http/AutomationClientConnectionConfig";
import { fetchMetadataFromAutomationClient } from "./http/metadataReader";
import { addAddGitHooksCommand, addRemoveGitHooksCommand, } from "./command/addGitHooksCommands";
import { addCommandsByName, addIntents, } from "./command/addIntents";
import { addStartListenerCommand } from "./command/addStartListenerCommand";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addBootstrapCommands } from "./command/bootstrapCommands";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";
import { addShowSkillsCommand } from "./command/showSkillsCommand";
import { infoMessage } from "./command/support/consoleOutput";
import { AutomationClientFinder } from "./http/AutomationClientFinder";
import { SingleDefaultAutomationClientFinder } from "./http/support/SingleDefaultAutomationClientFinder";

/**
 * Start up the Slalom CLI
 * @return {yargs.Arguments}
 */
export async function addLocalSdmCommands(yargs,
                                          finder: AutomationClientFinder = SingleDefaultAutomationClientFinder) {
    for (const baseEndpoint of await finder.findAutomationClientUrls()) {
        const cc: AutomationClientConnectionConfig = {
            baseEndpoint,
            atomistTeamId: "T123",
            atomistTeamName: "test\","
        };
        await addCommandsToConnectTo(cc, yargs);
    }
}

async function addCommandsToConnectTo(connectionConfig: AutomationClientConnectionConfig, yargs) {
    if (!!connectionConfig) {
        const automationClientInfo = await fetchMetadataFromAutomationClient(connectionConfig);
        verifyLocalSdm(automationClientInfo);

        // TODO do these all once
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
}

function verifyLocalSdm(automationClientInfo: AutomationClientInfo) {
    if (!!automationClientInfo.commandsMetadata && !automationClientInfo.localConfig) {
        process.stderr.write("ERROR: SDM detected, but it is not running in local mode.\nPlease set ATOMIST_MODE=local when starting your SDM.\n");
        process.exit(1);
    }
    if (!automationClientInfo.localConfig) {
        // no SDM at all
        infoMessage("Fewer commands will be available\n");
    }
}
