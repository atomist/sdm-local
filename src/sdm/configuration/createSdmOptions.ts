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
import { EphemeralLocalArtifactStore, LocalModeConfiguration } from "@atomist/sdm-core";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { CachingProjectLoader } from "@atomist/sdm/api-helper/project/CachingProjectLoader";
import { defaultAutomationClientFinder } from "../../cli/invocation/http/support/defaultAutomationClientFinder";
import { DefaultTeamContextResolver } from "../../common/binding/defaultTeamContextResolver";
import { TeamContextResolver } from "../../common/binding/TeamContextResolver";
import { defaultLocalLocalModeConfiguration } from "../../common/configuration/defaultLocalModeConfiguration";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedTreeRepoFinder } from "../binding/project/expandedTreeRepoFinder";
import { ExpandedTreeRepoRefResolver } from "../binding/project/ExpandedTreeRepoRefResolver";
import { FileSystemProjectLoader } from "../binding/project/FileSystemProjectLoader";
import { fileSystemProjectPersister } from "../binding/project/fileSystemProjectPersister";
import { LocalRepoTargets } from "../binding/project/LocalRepoTargets";

/**
 * Merge user-supplied configuration with defaults
 * to provide configuration for a local-mode SDM
 */
export function createSdmOptions(localModeConfig: LocalModeConfiguration,
                                 teamContextResolver: TeamContextResolver = DefaultTeamContextResolver): SoftwareDeliveryMachineOptions {
    const automationClientFinder = defaultAutomationClientFinder();

    const configToUse: LocalModeConfiguration = {
        ...defaultLocalLocalModeConfiguration(),
        ...localModeConfig,
    };

    const repoRefResolver = new ExpandedTreeRepoRefResolver(configToUse.repositoryOwnerParentDirectory);
    return {
        artifactStore: new EphemeralLocalArtifactStore(),
        projectLoader: new FileSystemProjectLoader(
            new CachingProjectLoader(),
            configToUse),
        logFactory: async (context, goal) => new LoggingProgressLog(goal.name, "info"),
        credentialsResolver: EnvironmentTokenCredentialsResolver,
        repoRefResolver,
        repoFinder: expandedTreeRepoFinder(configToUse.repositoryOwnerParentDirectory),
        projectPersister: fileSystemProjectPersister(teamContextResolver.teamContext, configToUse, automationClientFinder),
        targets: () => new LocalRepoTargets(configToUse.repositoryOwnerParentDirectory),
    };
}
