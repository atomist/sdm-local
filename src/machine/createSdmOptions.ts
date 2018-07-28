import { SoftwareDeliveryMachineOptions } from "@atomist/sdm";
import { EphemeralLocalArtifactStore } from "@atomist/sdm-core";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { CachingProjectLoader } from "@atomist/sdm/api-helper/project/CachingProjectLoader";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedTreeRepoFinder } from "../binding/expandedTreeRepoFinder";
import { FileSystemProjectLoader } from "../binding/FileSystemProjectLoader";
import { fileSystemProjectPersister } from "../binding/fileSystemProjectPersister";
import { LocalRepoRefResolver } from "../binding/LocalRepoRefResolver";
import { LocalRepoTargets } from "../binding/LocalRepoTargets";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { DefaultAutomationClientConnectionConfig } from "../entry/resolveConnectionConfig";

/**
 * Merge user-supplied configuration with defaults
 * to provide configuration for a local-mode SDM
 * @param {LocalMachineConfig} localMachineConfig
 */
export function createSdmOptions(localMachineConfig: LocalMachineConfig): SoftwareDeliveryMachineOptions {
    const cc = DefaultAutomationClientConnectionConfig;
    const repoRefResolver = new LocalRepoRefResolver(localMachineConfig.repositoryOwnerParentDirectory);
    return {
        // TODO this is the only use of sdm-core
        artifactStore: new EphemeralLocalArtifactStore(),
        projectLoader: new FileSystemProjectLoader(
            new CachingProjectLoader(),
            localMachineConfig),
        logFactory: async (context, goal) => new LoggingProgressLog(goal.name),
        credentialsResolver: EnvironmentTokenCredentialsResolver,
        repoRefResolver,
        repoFinder: expandedTreeRepoFinder(localMachineConfig.repositoryOwnerParentDirectory),
        projectPersister: fileSystemProjectPersister(cc, localMachineConfig),
        targets: () => new LocalRepoTargets(localMachineConfig.repositoryOwnerParentDirectory),
    };
}
