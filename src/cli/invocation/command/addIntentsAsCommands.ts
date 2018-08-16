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

import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { logger } from "@atomist/sdm";
import { WorkspaceContextResolver } from "../../../common/binding/WorkspaceContextResolver";
import { LocalWorkspaceContext } from "../../../common/invocation/LocalWorkspaceContext";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { logExceptionsToConsole } from "../../ui/consoleOutput";
import { PostToAtomistListenerListener, ShowDescriptionListener } from "./support/commandInvocationListeners";
import { commandLineParametersFromCommandHandlerMetadata } from "./support/exposeParameters";
import { runCommandOnColocatedAutomationClient } from "./support/runCommandOnColocatedAutomationClient";
import { YargBuilder } from "./support/yargBuilder";

/**
 * Add commands for all intents
 * @param allowUserInput whether to make all parameters optional, allowing user input to supply them
 */
export function addIntentsAsCommands(ai: AutomationClientInfo,
                                     yargBuilder: YargBuilder,
                                     workSpaceContextResolver: WorkspaceContextResolver,
                                     allowUserInput: boolean = true) {
    const handlers = ai.client.commands
        .filter(hm => !!hm.intent && hm.intent.length > 0);

    handlers.forEach(h =>
        h.intent.forEach(intent =>
            yargBuilder.withSubcommand({
                command: intent,
                describe: h.description,
                handler: async argv => {
                    logger.debug("Args are %j", argv);
                    return logExceptionsToConsole(
                        () => runByIntent(ai, h, argv, workSpaceContextResolver.workspaceContext),
                        true);
                },
                parameters: commandLineParametersFromCommandHandlerMetadata(h, allowUserInput),
                conflictResolution: {
                    failEverything: false,
                    commandDescription: `Intent '${intent}' on command ${h.name}`,
                },
            })));
}

async function runByIntent(ai: AutomationClientInfo,
                           hm: CommandHandlerMetadata,
                           command: any,
                           workspaceContext: LocalWorkspaceContext): Promise<any> {
    return runCommandOnColocatedAutomationClient(ai.location,
        ai.localConfig.repositoryOwnerParentDirectory,
        {
            workspaceName: workspaceContext.workspaceName,
            workspaceId: workspaceContext.workspaceId,
        },
        hm, command, [ShowDescriptionListener, PostToAtomistListenerListener]);
}
