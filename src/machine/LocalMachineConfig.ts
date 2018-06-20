import { ConfigureMachine } from "@atomist/sdm/api/machine/MachineConfigurer";
import { LocalSoftwareDeliveryMachineConfiguration } from "./LocalSoftwareDeliveryMachineConfiguration";

/**
 * A file named local.ts must define a Local constant of this type
 */
export interface LocalMachineConfig extends Partial<LocalSoftwareDeliveryMachineConfiguration> {

    // TODO could come from package.JSON or we could have multiple?
    name: string;

    repositoryOwnerParentDirectory: string;

    /**
     * Override local seeds?
     */
    preferLocalSeeds: boolean;

    /**
     * Function to initialize machine
     */
    init: ConfigureMachine;

}
