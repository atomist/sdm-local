import { BuildStatus, ExtensionPack, SoftwareDeliveryMachine } from "@atomist/sdm";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { HttpBuildStatusUpdater } from "../binding/HttpBuildStatusUpdater";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
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
            const buu = new HttpBuildStatusUpdater(DefaultAutomationClientConnectionConfig);
            bu.updateBuildStatus = buu.updateBuildStatus.bind(buu);
        }
    },
};

function addLocalLifecycle(sdm: SoftwareDeliveryMachine) {
    sdm.addPushImpactListener(async pu => {
        return pu.addressChannels(`Push to \`${pu.id.owner}:${pu.id.repo}\` - _${pu.commit.message}_`);
    });
    sdm.addBuildListener(async bu => {
        return bu.addressChannels(`Build status is \`${bu.build.status}\` ${buildStatusEmoji(bu.build.status)}`);
    });
}

function buildStatusEmoji(status: BuildStatus): string {
    switch (status) {
        case BuildStatus.passed :
            return ":tada:";
        case BuildStatus.started:
            return "";
        default:
            return "";
    }
}
