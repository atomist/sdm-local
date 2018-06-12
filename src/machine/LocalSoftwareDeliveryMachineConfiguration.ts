import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm";
import { MappedParameterResolver } from "../binding/MappedParameterResolver";

export interface LocalSoftwareDeliveryMachineConfiguration extends SoftwareDeliveryMachineConfiguration {

    /**
     * $/<owner>/<repo>
     */
    repositoryOwnerParentDirectory: string;

    mappedParameterResolver: MappedParameterResolver;

    /**
     * Whether to merge autofixes automatically
     */
    mergeAutofixes: boolean;
}
