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
import { DefaultWorkspaceContextResolver } from "../../../common/binding/defaultWorkspaceContextResolver";
import { WorkspaceContextResolver } from "../../../common/binding/WorkspaceContextResolver";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { infoMessage } from "../../ui/consoleOutput";
import { AutomationClientFinder } from "../http/AutomationClientFinder";
import { defaultAutomationClientFinder } from "../http/support/defaultAutomationClientFinder";
import { addBootstrapCommands } from "./addBootstrapCommands";
import { addCommandsByName } from "./addCommandsByName";
import { addAddGitHooksCommand, addRemoveGitHooksCommand } from "./addGitHooksCommands";
import { addCloneCommand } from "./addCloneCommand";
import { addIntentsAsCommands } from "./addIntentsAsCommands";
import { addShowSdmsCommand } from "./addShowSdmsCommand";
import { addFeedCommand } from "./addFeedCommand";
import { addStartSdmDeliveryMachine } from "./addStartSdmDeliveryMachine";
import { addReplayCommand } from "./addReplayCommand";
import { addShowSkillsCommand } from "./showSkillsCommand";
import { freshYargSaver, isYargSaver, optimizeOrThrow, YargSaver } from "./support/YargSaver";

/**
 * Given a yargs instance, add commands based on local SDMs we can connect to
 * @param yargs instance to customize
 * @param finder strategy for finding running automation client instances
 * @return {yargs.Arguments}
 */
export async function addLocalSdmCommands(yargs: Argv | YargSaver,
                                          finder: AutomationClientFinder = defaultAutomationClientFinder()) {
    const teamContextResolver: WorkspaceContextResolver = DefaultWorkspaceContextResolver;

    const yargSaver = isYargSaver(yargs) ? yargs : freshYargSaver();
    addBootstrapCommands(yargSaver);
    addStartSdmDeliveryMachine(yargSaver);
    addFeedCommand(yargSaver);
    addAddGitHooksCommand(yargSaver);
    addRemoveGitHooksCommand(yargSaver);

    addReplayCommand(yargSaver, finder, teamContextResolver);

    const clients = await finder.findAutomationClients();

    addShowSdmsCommand(clients, yargSaver);

    // TODO filter on working directories
    for (const client of clients) {
        await addCommandsToConnectTo(client, yargSaver);
    }
    if (!isYargSaver(yargs)) {
        // we constructed this, so use it
        optimizeOrThrow(yargSaver).save(yargs);
    }
}

/**
 * Add commands to command to this automation client
 * @param yargs
 * @return {Promise<void>}
 */
async function addCommandsToConnectTo(client: AutomationClientInfo, yargSaver: YargSaver) {
    verifyLocalSdm(client);

    if (!!client.localConfig) {
        addCloneCommand(client, yargSaver);
    }

    // If we were able to connect to an SDM...
    if (!!client.client) {
        addCommandsByName(client, yargSaver);
        addIntentsAsCommands(client, yargSaver);
        addShowSkillsCommand(client, yargSaver);
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
