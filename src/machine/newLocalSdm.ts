import { WellKnownGoals } from "@atomist/sdm-core";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { LocalSoftwareDeliveryMachine } from "./LocalSoftwareDeliveryMachine";
import { mergeConfiguration } from "./mergeConfiguration";

export function newLocalSdm(config: LocalMachineConfig): LocalSoftwareDeliveryMachine {
    const sdm = new LocalSoftwareDeliveryMachine(
        config.name,
        mergeConfiguration(
            config));
    sdm.addExtensionPacks(WellKnownGoals);

    config.init(sdm);

    return sdm;
}
