import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm";
import { MappedParameterResolver } from "../binding/MappedParameterResolver";
import { GoalDisplayer } from "../invocation/cli/support/GoalDisplayer";

export interface LocalSoftwareDeliveryMachineConfiguration extends SoftwareDeliveryMachineConfiguration {

    /**
     * $/<owner>/<repo>
     */
    repositoryOwnerParentDirectory: string;

    //mappedParameterResolver: MappedParameterResolver;

    /**
     * Full path to local script to call from git hooks.
     * typically <SDM project home>/src/local/build/src/gitHook.js
     */
    gitHookScript: string;

    /**
     * Override local seeds?
     */
    preferLocalSeeds: boolean;

    /**
     * Whether to merge autofixes automatically
     */
    mergeAutofixes: boolean;

    goalDisplayer: GoalDisplayer;

    /**
     * Whether to display error stacks to console
     */
    showErrorStacks?: boolean;
}
