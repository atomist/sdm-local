import { BuildStatus, ExtensionPack, OnBuildComplete, SoftwareDeliveryMachine } from "@atomist/sdm";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { isLocal } from "./isLocal";
import { addressSlackChannels } from "@atomist/automation-client/spi/message/MessageClient";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { EventHandlerInvocation, invokeEventHandler } from "../invocation/http/EventHandlerInvocation";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
import Build = OnBuildComplete.Build;

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
            bu.updateBuildStatus = async (rb, status) => {
                process.stdout.write("***BUILD STATUS " + status);
                // TODO parameterize  - plus very fragile
                // const payload: Build = {
                //     buildId: rb.url,
                //     status: status as BuildStatus,
                //     // TODO need more stuff on this
                // };
                // const handlerNames = ["InvokeListenersOnBuildComplete", "SetStatusOnBuildComplete"];
                //
                // return Promise.all(handlerNames.map(name =>
                //     invokeEventHandler(DefaultAutomationClientConnectionConfig, {
                //         name,
                //         payload,
                //     })));
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
        return bu.addressChannels(`Build status is ${bu.build.status}`);
    });
}
