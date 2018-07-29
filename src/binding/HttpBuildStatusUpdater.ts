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
