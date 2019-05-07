/*
 * Copyright © 2019 Atomist, Inc.
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
import { addCloneCommand } from "./addCloneCommand";
import { addCommandsByName } from "./addCommandsByName";
import { addFeedCommand } from "./addFeedCommand";
import {
    addAddGitHooksCommand,
    addRemoveGitHooksCommand,
} from "./addGitHooksCommands";
import { addGitHubImportCommand } from "./addGitHubImportCommand";
import { addIntentsAsCommands } from "./addIntentsAsCommands";
import { addReplayCommand } from "./addReplayCommand";
import { addShowSdmsCommand } from "./addShowSdmsCommand";
import { addStartSdmDeliveryMachine } from "./addStartSdmDeliveryMachine";
import { addShowSkillsCommand } from "./showSkillsCommand";
import {
    freshYargBuilder,
    isYargBuilder,
    YargBuilder,
} from "./support/yargBuilder";

/**
 * Given a yargs instance, add commands based on local SDMs we can connect to
 * @param yargs instance to customize
 * @param finder strategy for finding running automation client instances
 * @return {yargs.Arguments}
 */
export async function addLocalSdmCommands(yargs: Argv | YargBuilder,
                                          finder: AutomationClientFinder = defaultAutomationClientFinder()): Promise<void> {
    const workspaceContextResolver: WorkspaceContextResolver = DefaultWorkspaceContextResolver;

    const yargBuilder = isYargBuilder(yargs) ? yargs : freshYargBuilder();
    addBootstrapCommands(yargBuilder);
    addStartSdmDeliveryMachine(yargBuilder);
    addFeedCommand(yargBuilder);
    addAddGitHooksCommand(yargBuilder);
    addRemoveGitHooksCommand(yargBuilder);

    addReplayCommand(yargBuilder, finder, workspaceContextResolver);

    const clients = (await finder.findAutomationClients())
        .filter(client => !!client.localConfig);

    addShowSdmsCommand(clients, yargBuilder);
    addShowSkillsCommand(clients, yargBuilder);

    addCloneCommand(clients, yargBuilder, workspaceContextResolver);
    addGitHubImportCommand(clients, yargBuilder, workspaceContextResolver);

    // TODO filter on working directories
    for (const client of clients) {
        await addCommandsToConnectTo(client, yargBuilder, workspaceContextResolver);
    }
    if (!isYargBuilder(yargs)) {
        // we constructed this, so use it
        yargBuilder.build().save(yargs);
    }
}

/**
 * Add commands to command to this automation client
 * @return {Promise<void>}
 */
async function addCommandsToConnectTo(client: AutomationClientInfo,
                                      yargBuilder: YargBuilder,
                                      workspaceContextResolver: WorkspaceContextResolver): Promise<void> {
    verifyLocalSdm(client);

    // If we were able to connect to an SDM...
    if (!!client.client) {
        addCommandsByName(client, yargBuilder, workspaceContextResolver);
        addIntentsAsCommands(client, yargBuilder, workspaceContextResolver);
    }
}

function verifyLocalSdm(client: AutomationClientInfo): void {
    if (!!client.location && !client.localConfig) {
        infoMessage(`Detected non-local SDM '${client.client.name}:${client.client.version}'.
To make commands available here please restart this SDM with 'atomist start --local'.

`);
    }
}
