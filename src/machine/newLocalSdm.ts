import { LocalMachineConfig } from "./LocalMachineConfig";
import { WellKnownGoals } from "@atomist/sdm-core";
import { mergeConfiguration } from "./mergeConfiguration";
import { LocalSoftwareDeliveryMachine } from "./LocalSoftwareDeliveryMachine";

export function newLocalSdm(config: LocalMachineConfig): LocalSoftwareDeliveryMachine {
    const sdm = new LocalSoftwareDeliveryMachine(
        config.name,
        mergeConfiguration(
            config));
    sdm.addExtensionPacks(WellKnownGoals);

    config.init(sdm);

    return sdm;
}
