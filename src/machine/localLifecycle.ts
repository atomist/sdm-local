import { ExtensionPack, SoftwareDeliveryMachine } from "@atomist/sdm";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { isLocal } from "./isLocal";
import { addressSlackChannels } from "@atomist/automation-client/spi/message/MessageClient";

/**
 * Add Local IO to the given SDM.
 * Analogous to Slack lifecycle.
 */
export const LocalLifecycle: ExtensionPack = {
    ...metadata(),
    configure: sdm => {
        if (isLocal()) {
            addLocalLifecycle(sdm);
        }
    },
};

function addLocalLifecycle(sdm: SoftwareDeliveryMachine) {
    sdm.addPushImpactListener(async pu => {
        process.stdout.write(`xPush to ${pu.id.owner}:${pu.id.repo} - ${pu.commit.message}\n`);
        return pu.addressChannels(`xPush to ${pu.id.owner}:${pu.id.repo} - ${pu.commit.message}`);
    });
}
