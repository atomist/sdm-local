/**
 * Configuration within a automation client in local mode that this
 * project will connect to.
 * A file named local.ts must define a Local constant of this type
 */
export interface LocalMachineConfig {

    name: string;

    repositoryOwnerParentDirectory: string;

    /**
     * Use local seeds (in whatever git state) vs cloning if possible?
     */
    preferLocalSeeds: boolean;

    /**
     * Whether to merge autofixes automatically
     */
    mergeAutofixes?: boolean;

}
