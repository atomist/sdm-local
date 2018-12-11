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

import {
    configureLogging,
    logger,
    LoggingConfiguration,
    PlainLogging,
} from "@atomist/automation-client";
import { DefaultWorkspaceContextResolver } from "../../../common/binding/defaultWorkspaceContextResolver";
import { isAtomistTemporaryBranch } from "../../../sdm/binding/project/FileSystemProjectLoader";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { argsToGitHookInvocation } from "../../entry/argsToGitHookInvocation";
import {
    infoMessage,
    logExceptionsToConsole,
} from "../../ui/consoleOutput";
import { renderEventDispatch } from "../../ui/renderClientInfo";
import { suggestStartingAllMessagesListener } from "../command/support/suggestStartingAllMessagesListener";
import { AutomationClientFinder } from "../http/AutomationClientFinder";
import { defaultAutomationClientFinder } from "../http/support/defaultAutomationClientFinder";
import {
    GitHookInvocation,
    handleGitHookEvent,
} from "./handleGitHookEvent";

const loggingConfiguration: LoggingConfiguration = {
    console: {
        ...PlainLogging.console,
        level: "warn",
    },
    file: {
        enabled: false,
    },
};

const verbose = process.env.ATOMIST_GITHOOK_VERBOSE === "true";

/**
 * Main entry point for processing git hooks
 * Usage command <git hook name> <directory> <branch> <sha>
 */
export async function runOnGitHook(argv: string[],
                                   clientFinder: AutomationClientFinder = defaultAutomationClientFinder(),
) {
    configureLogging(loggingConfiguration);
    const invocation = await argsToGitHookInvocation(argv, DefaultWorkspaceContextResolver);
    if (isAtomistTemporaryBranch(invocation.branch)) {
        logger.info("Ignoring Atomist temporary branch in '%j': Atomist will eventually surface these changes to let hook react",
            invocation);
        return undefined;
    }

    await suggestStartingAllMessagesListener();
    const clients = await clientFinder.findAutomationClients();
    if (clients.length === 0 && verbose) {
        infoMessage("No Atomist connected clients found");
        process.exit(0);
    }
    return Promise.all(clients.map(client => sendTo(client, invocation)));
}

/**
 * Send to a single automation client
 * @param {AutomationClientInfo} automationClientInfo
 * @param {GitHookInvocation} invocation
 * @return {Promise<void>}
 */
async function sendTo(automationClientInfo: AutomationClientInfo, invocation: GitHookInvocation) {
    if (!automationClientInfo.localConfig) {
        if (verbose) {
            infoMessage("Not a local machine; not delivering push event.\n");
        }
        // process.exit(0); // This is a lot faster than just returning. I don't want to make your commit slow.
    } else {
        logger.debug("Executing git hook against project %j", invocation);
        if (verbose) {
            infoMessage(renderEventDispatch(automationClientInfo, invocation));
        }
        return logExceptionsToConsole(() =>
            handleGitHookEvent(
                automationClientInfo.location,
                automationClientInfo.localConfig, invocation),
            true,
        );
    }
}
