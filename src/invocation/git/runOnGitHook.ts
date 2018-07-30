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

import { logger } from "@atomist/automation-client";
import { isAtomistTemporaryBranch } from "../../binding/project/FileSystemProjectLoader";
import { logExceptionsToConsole } from "../cli/command/support/consoleOutput";
import { suggestStartingAllMessagesListener } from "../cli/command/support/suggestStartingAllMessagesListener";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { fetchMetadataFromAutomationClient } from "../http/metadataReader";
import {
    argsToGitHookInvocation,
    handleGitHookEvent,
} from "./handlePushBasedEventOnRepo";

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export async function runOnGitHook(argv: string[], connectionConfig: AutomationClientConnectionConfig) {
    const invocation = argsToGitHookInvocation(argv);
    if (isAtomistTemporaryBranch(invocation.branch)) {
        logger.info("Ignoring Atomist temporary branch in '%j': Atomist will eventually surface these changes to let hook react",
            invocation);
        return;
    }
    const automationClientInfo = await fetchMetadataFromAutomationClient(connectionConfig);
    await suggestStartingAllMessagesListener();
    logger.debug("Executing git hook against project %j", invocation);
    return logExceptionsToConsole(() =>
            handleGitHookEvent(connectionConfig, automationClientInfo.localConfig, invocation),
        automationClientInfo.connectionConfig.showErrorStacks,
    );
}
