import {
    BuildStatus,
    ExtensionPack,
    OnBuildComplete,
    SdmGoalEvent,
    SoftwareDeliveryMachine,
} from "@atomist/sdm";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
import { invokeEventHandler } from "../invocation/http/EventHandlerInvocation";
import { isLocal } from "./isLocal";

/**
 * Add Local IO to the given SDM.
 * Analogous to Slack lifecycle.
 */
export const LocalLifecycle: ExtensionPack = {
    ...metadata(),
    configure: sdm => {
        if (isLocal()) {
            addLocalLifecycle(sdm);
            const bu = sdm as any as BuildStatusUpdater;
            bu.updateBuildStatus = async (rb, status, branch, buildNo, ctx) => {
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
                     invokeEventHandler(DefaultAutomationClientConnectionConfig, {
                         name,
                         payload,
                     })));
            };
        }
    },
};

function addLocalLifecycle(sdm: SoftwareDeliveryMachine) {
    sdm.addPushImpactListener(async pu => {
        return pu.addressChannels(`Push to ${pu.id.owner}:${pu.id.repo} - ${pu.commit.message}`);
    });
    sdm.addBuildListener(async bu => {
        process.stdout.write(`Build status is ${bu.build.status}`);
        return bu.addressChannels(`Build status is ${bu.build.status} ${bu.build.status === BuildStatus.passed ? ":tada:" : ""}`);
    });
}
