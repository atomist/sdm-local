import { ConfigureMachine } from "@atomist/sdm/api/machine/MachineConfigurer";
import { GoalDisplayer } from "../invocation/cli/support/GoalDisplayer";
import { LocalSoftwareDeliveryMachineConfiguration } from "./LocalSoftwareDeliveryMachineConfiguration";

/**
 * A file named local.ts must define a Local constant of this type
 */
export interface LocalMachineConfig extends Partial<LocalSoftwareDeliveryMachineConfiguration> {

    name: string;

    repositoryOwnerParentDirectory: string;

    /**
     * Full path to local script to call from git hooks.
     * typically <SDM project home>/src/local/build/src/gitHook.js
     */
    gitHookScript: string;

    /**
     * Use local seeds (in whatever git state) vs cloning if possible?
     */
    preferLocalSeeds: boolean;

    /**
     * Function to initialize machine
     */
    init: ConfigureMachine;

    goalDisplayer?: GoalDisplayer;

}

export function isLocalMachineConfig(a: object): a is LocalMachineConfig {
    const maybe = a as LocalMachineConfig;
    return !!maybe.gitHookScript && !!maybe.repositoryOwnerParentDirectory;
}
