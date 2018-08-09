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

import { LocalModeConfiguration } from "@atomist/sdm-core";
import { EventOnRepo, handlePushBasedEventOnRepo } from "../../../common/git/handlePushBasedEventOnRepo";
import { InvocationTarget } from "../../../common/invocation/InvocationTarget";
import { errorMessage } from "../../ui/consoleOutput";
import { AutomationClientConnectionRequest } from "../http/AutomationClientConnectionConfig";
import { invokeEventHandlerUsingHttp } from "../http/invokeEventHandlerUsingHttp";

export interface GitHookInvocation extends EventOnRepo {

    event: string;

    teamId: string;
}

/**
 * Git hooks we support
 * @type {string[]}
 */
export enum HookEvent {
    PostCommit = "post-commit",
    PostMerge = "post-merge",
    PreReceive = "pre-receive",
}

/**
 * Invoking the target remote client for this push.
 * @param payload event data
 * @return {Promise<any>}
 */
export async function handleGitHookEvent(cc: AutomationClientConnectionRequest,
                                         lc: LocalModeConfiguration,
                                         payload: GitHookInvocation) {
    if (!payload) {
        return errorMessage("Payload must be supplied");
    }
    if (!payload.event) {
        return errorMessage("Invalid git hook invocation payload. Event is required: %j", payload);
    }
    if (!Object.values(HookEvent).includes(payload.event)) {
        return errorMessage("Unknown git hook event '%s'", event);
    }
    if (!lc) {
        return errorMessage("LocalModeConfiguration must be supplied");
    }

    const target: InvocationTarget = {
        atomistTeamId: payload.teamId,
        // TODO fix
        atomistTeamName: payload.teamId,
    };

    return handlePushBasedEventOnRepo(payload.teamId,
        invokeEventHandlerUsingHttp(cc, target),
        lc, payload, "SetGoalsOnPush");
}
