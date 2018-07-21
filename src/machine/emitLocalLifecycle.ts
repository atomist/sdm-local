import { SoftwareDeliveryMachineMaker } from "@atomist/sdm-core/internal/machine/configureSdm";

export function emitLocalLifecycle(sdmMaker: SoftwareDeliveryMachineMaker): SoftwareDeliveryMachineMaker {
    return configuration => {
        const sdm = sdmMaker(configuration);
        sdm.addPushImpactListener(async pu => {
            return pu.addressChannels(`Push - ${pu.commit.message}`);
        });
        return sdm;
    };
}
