import { SoftwareDeliveryMachineOptions } from "@atomist/sdm";
import { EphemeralLocalArtifactStore } from "@atomist/sdm-core";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { CachingProjectLoader } from "@atomist/sdm/api-helper/project/CachingProjectLoader";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedTreeRepoFinder } from "../binding/project/expandedTreeRepoFinder";
import { ExpandedTreeRepoRefResolver } from "../binding/project/ExpandedTreeRepoRefResolver";
import { FileSystemProjectLoader } from "../binding/project/FileSystemProjectLoader";
import { fileSystemProjectPersister } from "../binding/project/fileSystemProjectPersister";
import { LocalRepoTargets } from "../binding/project/LocalRepoTargets";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";
import { LocalMachineConfig } from "./LocalMachineConfig";

/**
 * Merge user-supplied configuration with defaults
 * to provide configuration for a local-mode SDM
 * @param {LocalMachineConfig} localMachineConfig
 */
export function createSdmOptions(localMachineConfig: LocalMachineConfig): SoftwareDeliveryMachineOptions {
    // TODO how do we find this?
    const cc = DefaultAutomationClientConnectionConfig;

    const repoRefResolver = new ExpandedTreeRepoRefResolver(localMachineConfig.repositoryOwnerParentDirectory);
    return {
        // TODO this is the only use of sdm-core
        artifactStore: new EphemeralLocalArtifactStore(),
        projectLoader: new FileSystemProjectLoader(
            new CachingProjectLoader(),
            localMachineConfig),
        logFactory: async (context, goal) => new LoggingProgressLog(goal.name, "info"),
        credentialsResolver: EnvironmentTokenCredentialsResolver,
        repoRefResolver,
        repoFinder: expandedTreeRepoFinder(localMachineConfig.repositoryOwnerParentDirectory),
        projectPersister: fileSystemProjectPersister(cc, localMachineConfig),
        targets: () => new LocalRepoTargets(localMachineConfig.repositoryOwnerParentDirectory),
    };
}
