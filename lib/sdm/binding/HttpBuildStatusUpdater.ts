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

import { HandlerContext } from "@atomist/automation-client";
import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { BuildStatus, OnBuildComplete, SdmGoalEvent } from "@atomist/sdm";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { LocalWorkspaceContext } from "../../common/invocation/LocalWorkspaceContext";
import { invokeEventHandlerInProcess } from "../invocation/invokeEventHandlerInProcess";

/**
 * Update build status by posting to an automation client
 */
export class HttpBuildStatusUpdater implements BuildStatusUpdater {

    public async updateBuildStatus(runningBuild: {
                                       repoRef: RemoteRepoRef;
                                       url: string;
                                       team: string;
                                   },
                                   status: "started" | "failed" | "error" | "passed" | "canceled",
                                   branch: string,
                                   buildNo: string,
                                   ctx: HandlerContext) {
        const goal: SdmGoalEvent = (ctx as any).trigger.data.SdmGoal[0];
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
                                id: ctx.workspaceId,
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
            invokeEventHandlerInProcess(this.workspaceContext)({
                name,
                payload,
            })));
    }

    constructor(private readonly workspaceContext: LocalWorkspaceContext) {}

}
