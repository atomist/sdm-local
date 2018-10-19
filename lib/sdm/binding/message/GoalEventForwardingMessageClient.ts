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
    Destination,
    logger,
    MessageClient,
    MessageOptions,
    SlackMessageClient,
} from "@atomist/automation-client";
import {
    OnAnyRequestedSdmGoal,
    SdmGoalKey,
    SdmGoalState,
} from "@atomist/sdm";
import { isGitHubAction } from "@atomist/sdm-core";
import { SlackMessage } from "@atomist/slack-messages";
import { DefaultWorkspaceContextResolver } from "../../../common/binding/defaultWorkspaceContextResolver";
import { invokeEventHandlerInProcess } from "../../invocation/invokeEventHandlerInProcess";

export function isSdmGoalStoreOrUpdate(o: any): o is (SdmGoalKey & {
    state: SdmGoalState;
    sha: string;
    branch: string;
}) {
    const maybe = o as SdmGoalKey;
    return !!maybe.name && !!maybe.environment;
}

/**
 * Runs inside an SDM in local mode. As Goal storage uses
 * a MessageClient, this enables a local SDM to react to goals that
 * it has set. This implementation ignores other messages and forwards
 * goals only.
 * Will onDispatch goal events to the appropriate event handler
 * within the SDM at the known address.
 */
export class GoalEventForwardingMessageClient implements MessageClient, SlackMessageClient {

    public async respond(msg: string | SlackMessage, options?: MessageOptions): Promise<any> {
        // Ignore
    }

    public async send(msg: any, destinations: Destination | Destination[], options?: MessageOptions): Promise<any> {
        if (isSdmGoalStoreOrUpdate(msg)) {
            let handlerNames: string[] = [];
            if (isGitHubAction() && process.argv.length >= 3) {
                const goal = process.argv.slice(2).join(" ");
                if (msg.name === goal) {
                    if (msg.state === SdmGoalState.planned || msg.state === SdmGoalState.requested) {
                        msg.state = SdmGoalState.requested;
                        handlerNames = ["FulfillGoalOnRequested"];
                    } else {
                        switch (msg.state) {
                            case SdmGoalState.failure :
                            case SdmGoalState.stopped :
                                handlerNames = ["RespondOnGoalCompletion", "SkipDownstreamGoalsOnGoalFailure"];
                                break;
                            case SdmGoalState.success:
                                handlerNames = ["RespondOnGoalCompletion"];
                                break;
                            case SdmGoalState.skipped :
                            case SdmGoalState.in_process :
                            case SdmGoalState.waiting_for_approval :
                            case SdmGoalState.approved :
                            case SdmGoalState.waiting_for_pre_approval :
                            case SdmGoalState.pre_approved :
                            case SdmGoalState.canceled :
                                break;
                        }
                    }
                }
            } else {
                logger.log("silly", "Storing SDM goal or ingester payload %j", msg);
                switch (msg.state) {
                    case SdmGoalState.requested:
                        handlerNames = ["FulfillGoalOnRequested"];
                        break;
                    case SdmGoalState.failure :
                    case SdmGoalState.stopped :
                        handlerNames = ["RespondOnGoalCompletion", "SkipDownstreamGoalsOnGoalFailure"];
                        break;
                    case SdmGoalState.success:
                        handlerNames = ["RespondOnGoalCompletion", "RequestDownstreamGoalsOnGoalSuccess"];
                        break;
                    case SdmGoalState.skipped :
                    case SdmGoalState.in_process :
                    case SdmGoalState.planned :
                    case SdmGoalState.waiting_for_approval :
                    case SdmGoalState.approved :
                    case SdmGoalState.waiting_for_pre_approval :
                    case SdmGoalState.pre_approved :
                    case SdmGoalState.canceled :
                        break;
                }
            }
            const payload: OnAnyRequestedSdmGoal.Subscription = {
                SdmGoal: [msg],
            };

            // We want to return to let this work in the background
            // tslint:disable-next-line:no-floating-promises
            Promise.all(handlerNames.map(name =>
                // TODO pass this in
                invokeEventHandlerInProcess(DefaultWorkspaceContextResolver.workspaceContext)({
                    name,
                    payload,
                })));
        }
    }

    public async addressChannels(msg: string | SlackMessage, channels: string | string[], options?: MessageOptions): Promise<any> {
        // Ignore
    }

    public async addressUsers(msg: string | SlackMessage, users: string | string[], options?: MessageOptions): Promise<any> {
        // Ignore
    }

}
