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
import { EventOnRepo, handlePushBasedEventOnRepo } from "../../../common/handlePushBasedEventOnRepo";
import { LocalMachineConfig } from "../../../sdm/configuration/LocalMachineConfig";
import { errorMessage } from "../command/support/consoleOutput";
import { AutomationClientConnectionRequest } from "../http/AutomationClientConnectionConfig";
import { invokeEventHandlerUsingHttp } from "../http/invokeEventHandlerUsingHttp";

export interface GitHookInvocation extends EventOnRepo {
    // TODO scope to hook events
    event: string;

    teamId: string;
}

/**
 * Git hooks we support
 * @type {string[]}
 */
export const HookEvents = [
    "post-commit",
    "post-merge",
    "pre-receive",
];

/**
 * Process the given args (probably from process.argv) into a
 * GitHookInvocation
 * @param {string[]} argv
 * @return {GitHookInvocation}
 */
export function argsToGitHookInvocation(argv: string[]): GitHookInvocation {
    if (argv.length < 6) {
        logger.info("Not enough args to run Git hook: All args to git hook invocation are %j", argv);
        process.exit(0);
    }

    const args = argv.slice(2);
    const event: string = args[0];
    // We can be invoked in the .git/hooks directory or from the git binary itself
    const baseDir = args[1].replace(/.git[\/hooks]?$/, "")
        .replace(/\/$/, "");
    // TODO this is a bit questionable
    const branch = args[2].replace("refs/heads/", "");
    const sha = args[3];

    // TODO change this
    const teamId = "T123";
    return { event, baseDir, branch, sha, teamId };
}

/**
 * Invoking the target remote client for this push.
 * @param payload event data
 * @return {Promise<any>}
 */
export async function handleGitHookEvent(cc: AutomationClientConnectionRequest,
                                         lc: LocalMachineConfig,
                                         payload: GitHookInvocation) {
    if (!payload) {
        return errorMessage("Payload must be supplied");
    }
    if (!payload.event) {
        return errorMessage("Invalid git hook invocation payload. Event is required: %j", payload);
    }
    if (!HookEvents.includes(payload.event)) {
        return errorMessage("Unknown git hook event '%s'", event);
    }
    if (!lc) {
        return errorMessage("LocalMachineConfig must be supplied");
    }

    return handlePushBasedEventOnRepo(payload.teamId,
        invokeEventHandlerUsingHttp(cc, payload.teamId),
        lc, payload, "SetGoalsOnPush");
}
