/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { SoftwareDeliveryMachineOptions } from "@atomist/sdm";
import { EphemeralLocalArtifactStore } from "@atomist/sdm-core";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { CachingProjectLoader } from "@atomist/sdm/api-helper/project/CachingProjectLoader";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedTreeRepoFinder } from "../binding/project/expandedTreeRepoFinder";
import { ExpandedTreeRepoRefResolver } from "../binding/project/ExpandedTreeRepoRefResolver";
import { LocalRepoTargets } from "../binding/project/LocalRepoTargets";
import { DefaultAutomationClientConnectionConfig } from "../../cli/entry/resolveConnectionConfig";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { FileSystemProjectLoader } from "../binding/project/FileSystemProjectLoader";
import { fileSystemProjectPersister } from "../binding/project/fileSystemProjectPersister";

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
