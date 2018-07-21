import { ExtensionPack, SoftwareDeliveryMachine } from "@atomist/sdm";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { isLocal } from "./isLocal";

/**
 * Add Local IO to the given SDM.
 * Analogous to Slack lifecycle.
 */
export const LocalIo: ExtensionPack = {
    ...metadata(),
    configure: sdm => {
        if (isLocal()) {
            addLocalLifecycle(sdm);
        }
    },
};

function addLocalLifecycle(sdm: SoftwareDeliveryMachine) {
    sdm.addPushImpactListener(async pu => {
        process.stdout.write(`Push to ${pu.id.owner}:${pu.id.repo} - ${pu.commit.message}\n`);
        return pu.addressChannels(`Push to ${pu.id.owner}:${pu.id.repo} - ${pu.commit.message}`);
    });
}
