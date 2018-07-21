import { ExtensionPack, SoftwareDeliveryMachine } from "@atomist/sdm";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { isLocal } from "./isLocal";

/**
 * Add Local IO to the given SDM
 * @type {{name: string; vendor: string; version: string; configure: (sdm: SoftwareDeliveryMachine) => void}}
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
        return pu.addressChannels(`Push - ${pu.commit.message}`);
    });
}
