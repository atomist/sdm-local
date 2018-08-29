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

import { LocalSoftwareDeliveryMachineOptions } from "@atomist/sdm-core";
import {
    EventOnRepo,
    handlePushBasedEventOnRepo,
} from "../../../common/git/handlePushBasedEventOnRepo";
import { InvocationTarget } from "../../../common/invocation/InvocationTarget";
import { errorMessage } from "../../ui/consoleOutput";
import { AutomationClientConnectionRequest } from "../http/AutomationClientConnectionRequest";
import { invokeEventHandlerUsingHttp } from "../http/invokeEventHandlerUsingHttp";

export interface GitHookInvocation extends EventOnRepo {

    event: string;

    workspaceId: string;
}

/**
 * git hooks we support. All hooks are "post" hooks, meaning that
 * Atomist will never prevent completion of a git operation, but
 * will be invoked after it is complete.
 * @type {string[]}
 */
export enum HookEvent {
    /**
     * Used to respond to commits. Main Atomist entry point.
     */
    PostCommit = "post-commit",

    /**
     * Used when a branch has been merged
     */
    PostMerge = "post-merge",

    /**
     * Server side hook. Atomist will clone local projects, using the
     * file location as a remote. If it makes a transform or autofix,
     * the push from the cloned repo will result in this server side hook
     * firing on the original local repo.
     */
    PostReceive = "post-receive",
}

/**
 * Invoke an SDM to handle this event.
 * @param payload event data
 * @return {Promise<any>}
 */
export async function handleGitHookEvent(cc: AutomationClientConnectionRequest,
                                         lc: LocalSoftwareDeliveryMachineOptions,
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
        workspaceId: payload.workspaceId,
        workspaceName: payload.workspaceId,
    };

    return handlePushBasedEventOnRepo(payload.workspaceId,
        invokeEventHandlerUsingHttp(cc, target),
        lc, payload, "SetGoalsOnPush");
}
