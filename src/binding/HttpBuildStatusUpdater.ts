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
    BuildStatus,
    OnBuildComplete,
    SdmGoalEvent,
} from "@atomist/sdm";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";
import { invokeEventHandler } from "../invocation/http/EventHandlerInvocation";

/**
 * Update build status by posting to an automation client
 */
export class HttpBuildStatusUpdater implements BuildStatusUpdater {

    public async updateBuildStatus(rb, status, branch, buildNo, ctx) {
        const goal: SdmGoalEvent = (ctx).trigger.data.SdmGoal[0];
        const payload: OnBuildComplete.Subscription = {
            Build: [{
                buildId: buildNo,
                status: status as BuildStatus,
                commit: {
                    sha: goal.push.after.sha,
                    message: goal.push.after.message,
                    repo: {
                        name: goal.repo.name,
                        owner: goal.repo.owner,
                        channels: [{
                            name: goal.repo.name,
                            id: goal.repo.name,
                            team: {
                                id: ctx.teamId,
                            },
                        }],
                    },
                    statuses: [],
                },
                push: goal.push,
            }],
        };
        const handlerNames = ["InvokeListenersOnBuildComplete"];
        return Promise.all(handlerNames.map(name =>
            invokeEventHandler(this.acc, {
                name,
                payload,
            }, ctx.correlation_id)));
    }

    constructor(private readonly acc: AutomationClientConnectionConfig) {
    }
}
