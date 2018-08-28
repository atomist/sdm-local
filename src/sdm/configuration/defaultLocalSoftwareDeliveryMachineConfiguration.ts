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

import {
    getUserConfig,
    logger,
} from "@atomist/automation-client";
import { SoftwareDeliveryMachineOptions } from "@atomist/sdm";
import {
    EphemeralLocalArtifactStore,
    LocalSoftwareDeliveryMachineConfiguration,
    LocalSoftwareDeliveryMachineOptions,
} from "@atomist/sdm-core";
import { CachingProjectLoader } from "@atomist/sdm/api-helper/project/CachingProjectLoader";
import * as fs from "fs-extra";
import * as _ from "lodash";
import * as os from "os";
import * as path from "path";
import { defaultAutomationClientFinder } from "../../cli/invocation/http/support/defaultAutomationClientFinder";
import { DefaultWorkspaceContextResolver } from "../../common/binding/defaultWorkspaceContextResolver";
import { LocalWorkspaceContext } from "../../common/invocation/LocalWorkspaceContext";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { SimpleNodeLoggerProgressLog } from "../binding/log/SimpleNodeLoggerProgressLog";
import { expandedTreeRepoFinder } from "../binding/project/expandedTreeRepoFinder";
import { ExpandedTreeRepoRefResolver } from "../binding/project/ExpandedTreeRepoRefResolver";
import { FileSystemProjectLoader } from "../binding/project/FileSystemProjectLoader";
import { fileSystemProjectPersister } from "../binding/project/fileSystemProjectPersister";
import { LocalRepoTargets } from "../binding/project/LocalRepoTargets";

const DefaultAtomistRoot = "atomist";

/**
 * Defaults for local-SDM configuration
 */
export function defaultLocalSoftwareDeliveryMachineConfiguration(
    workspaceContext: LocalWorkspaceContext = DefaultWorkspaceContextResolver.workspaceContext): LocalSoftwareDeliveryMachineConfiguration {
    const automationClientFinder = defaultAutomationClientFinder();

    const localSdmConfiguration: LocalSoftwareDeliveryMachineOptions = {
        preferLocalSeeds: true,
        mergeAutofixes: true,
        repositoryOwnerParentDirectory: determineDefaultRepositoryOwnerParentDirectory(),
        hostname: determineDefaultHostUrl(),
    };

    const repoRefResolver = new ExpandedTreeRepoRefResolver(localSdmConfiguration.repositoryOwnerParentDirectory);
    const sdmConfiguration: SoftwareDeliveryMachineOptions = {
        artifactStore: new EphemeralLocalArtifactStore(),
        projectLoader: new FileSystemProjectLoader(
            new CachingProjectLoader(),
            localSdmConfiguration),
        logFactory: async (context, goal) =>
            new SimpleNodeLoggerProgressLog(goal.name, localSdmConfiguration.repositoryOwnerParentDirectory),
            // new LoggingProgressLog(goal.name, "info"),
        credentialsResolver: new EnvironmentTokenCredentialsResolver(),
        repoRefResolver,
        repoFinder: expandedTreeRepoFinder(localSdmConfiguration.repositoryOwnerParentDirectory),
        projectPersister: fileSystemProjectPersister(workspaceContext, localSdmConfiguration, automationClientFinder),
        targets: () => new LocalRepoTargets(localSdmConfiguration.repositoryOwnerParentDirectory),
    };

    return {
        sdm: sdmConfiguration,
        local: localSdmConfiguration,
    } as LocalSoftwareDeliveryMachineConfiguration;

}

export function determineDefaultRepositoryOwnerParentDirectory() {
    const root = process.env.ATOMIST_ROOT || path.join(os.homedir(), DefaultAtomistRoot);
    if (!fs.existsSync(root)) {
        logger.info(`Creating Atomist repository owner parent directory at '${root}'`);
        fs.mkdirSync(root, "0744");
    }
    return root;
}

const HostnamePath = "local.hostname";

export function determineDefaultHostUrl() {
    const config = getUserConfig();
    if (config) {
        const hostname = _.get(config, HostnamePath);
        if (hostname) {
            return hostname;
        }
    }
    return "127.0.0.1";
}