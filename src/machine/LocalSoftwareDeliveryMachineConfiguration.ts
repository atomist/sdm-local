import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm";
import { MappedParameterResolver } from "../binding/MappedParameterResolver";
import { GoalDisplayer } from "../invocation/cli/support/GoalDisplayer";

export interface LocalSoftwareDeliveryMachineConfiguration extends SoftwareDeliveryMachineConfiguration {

    /**
     * $/<owner>/<repo>
     */
    repositoryOwnerParentDirectory: string;

    mappedParameterResolver: MappedParameterResolver;

    /**
     * Override local seeds?
     */
    preferLocalSeeds: boolean;

    /**
     * Whether to merge autofixes automatically
     */
    mergeAutofixes: boolean;

    goalDisplayer: GoalDisplayer;
}
