import { ExtensionPack, SoftwareDeliveryMachine } from "@atomist/sdm";
import { metadata } from "@atomist/sdm/api-helper/misc/extensionPack";
import { isInLocalMode } from "@atomist/sdm-core";

/**
 * Extension pack that configures SDM for local
 * @type {{name: string; vendor: string; version: string; configure: (sdm) => void}}
 */
export const LocalSdmConfig: ExtensionPack = {
    ...metadata(),
    configure: sdm => {
        if (isInLocalMode()) {
            registerNoOpListeners(sdm);
        }
    },
};

const NoOp = () => Promise.resolve();

/**
 * Register no op listeners to ensure all handlers are emitted,
 * avoiding sdm-core optimization
 * @param {SoftwareDeliveryMachine} sdm
 */
function registerNoOpListeners(sdm: SoftwareDeliveryMachine) {
    sdm.addNewRepoWithCodeListener(NoOp)
        .addRepoCreationListener(NoOp)
        .addRepoOnboardingListener(NoOp)
        .addBuildListener(NoOp)
        .addChannelLinkListener(NoOp);
}