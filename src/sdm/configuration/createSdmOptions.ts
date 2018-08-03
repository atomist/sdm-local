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
import { DefaultAutomationClientConnectionConfig } from "../../cli/entry/resolveConnectionConfig";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedTreeRepoFinder } from "../binding/project/expandedTreeRepoFinder";
import { ExpandedTreeRepoRefResolver } from "../binding/project/ExpandedTreeRepoRefResolver";
import { FileSystemProjectLoader } from "../binding/project/FileSystemProjectLoader";
import { fileSystemProjectPersister } from "../binding/project/fileSystemProjectPersister";
import { LocalRepoTargets } from "../binding/project/LocalRepoTargets";
import * as os from "os";
import * as path from "path";

import { LocalModeConfiguration } from "@atomist/sdm-core";

/**
 * Merge user-supplied configuration with defaults
 * to provide configuration for a local-mode SDM
 */
export function createSdmOptions(localModeConfig: LocalModeConfiguration): SoftwareDeliveryMachineOptions {
    // TODO how do we find this?
    const cc = DefaultAutomationClientConnectionConfig;

    const configToUse: LocalModeConfiguration = {
        repositoryOwnerParentDirectory: determineDefaultRepositoryOwnerParentDirectory(),
        preferLocalSeeds: true,
        ...localModeConfig,
    };

    const repoRefResolver = new ExpandedTreeRepoRefResolver(configToUse.repositoryOwnerParentDirectory);
    return {
        // TODO this is the only use of sdm-core
        artifactStore: new EphemeralLocalArtifactStore(),
        projectLoader: new FileSystemProjectLoader(
            new CachingProjectLoader(),
            configToUse),
        logFactory: async (context, goal) => new LoggingProgressLog(goal.name, "info"),
        credentialsResolver: EnvironmentTokenCredentialsResolver,
        repoRefResolver,
        repoFinder: expandedTreeRepoFinder(configToUse.repositoryOwnerParentDirectory),
        projectPersister: fileSystemProjectPersister(cc, configToUse),
        targets: () => new LocalRepoTargets(configToUse.repositoryOwnerParentDirectory),
    };
}

const DefaultAtomistRoot = "atomist";

function determineDefaultRepositoryOwnerParentDirectory() {
    return process.env.ATOMIST_ROOT || path.join(os.homedir(), DefaultAtomistRoot);
}
