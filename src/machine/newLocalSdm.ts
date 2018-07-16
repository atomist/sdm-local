import { WellKnownGoals } from "@atomist/sdm-core";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { LocalSoftwareDeliveryMachine } from "./LocalSoftwareDeliveryMachine";
import { mergeConfiguration } from "./mergeConfiguration";

/**
 * Create a new local SDM instance with the given configuration
 * @param {LocalMachineConfig} config
 * @return {LocalSoftwareDeliveryMachine}
 */
export function newLocalSdm(config: LocalMachineConfig): LocalSoftwareDeliveryMachine {
    const sdm = new LocalSoftwareDeliveryMachine(
        config.name,
        mergeConfiguration(
            config));
    sdm.addExtensionPacks(WellKnownGoals);

    config.init(sdm);

    return sdm;
}
