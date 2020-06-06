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

import { CommandInvocation } from "@atomist/automation-client/lib/internal/invoker/Payload";
import * as serializeError from "serialize-error";
import { CommandCompletionDestination } from "../../../common/ui/CommandCompletionDestination";
import {AutomationEventListenerSupport} from "@atomist/automation-client/lib/server/AutomationEventListener";
import {HandlerContext} from "@atomist/automation-client/lib/HandlerContext";
import {logger} from "@atomist/automation-client/lib/util/logger";
import {HandlerResult} from "@atomist/automation-client/lib/HandlerResult";

/**
 * Event listener that sends an event on command termination
 */
export class NotifyOnCompletionAutomationEventListener extends AutomationEventListenerSupport {

    public commandSuccessful(payload: CommandInvocation, ctx: HandlerContext, result: HandlerResult): Promise<void> {
        return ctx.messageClient.send("Success", CommandCompletionDestination);
    }

    public commandFailed(payload: CommandInvocation, ctx: HandlerContext, error: any): Promise<void> {
        // Route the failure report to the client
        logger.error("Sending error 'msg'", error.message, serializeError(error));
        return ctx.messageClient.send({
            kind: FailureKind,
            error: serializeError(error),
        }, CommandCompletionDestination);
    }
}

const FailureKind = "failure";

export interface FailureMessage {

    kind: "failure";

    error: any;

}

export function isFailureMessage(o: any): o is FailureMessage {
    return o.kind === FailureKind;
}
