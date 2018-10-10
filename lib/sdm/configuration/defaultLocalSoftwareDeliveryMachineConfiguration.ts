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
    Configuration,
    configurationValue,
    logger,
} from "@atomist/automation-client";
import { getUserConfig } from "@atomist/automation-client/lib/configuration";
import {
    CachingProjectLoader,
    SoftwareDeliveryMachineOptions,
} from "@atomist/sdm";
import {
    EphemeralLocalArtifactStore,
    LocalSoftwareDeliveryMachineConfiguration,
    LocalSoftwareDeliveryMachineOptions,
} from "@atomist/sdm-core";
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

const DefaultAtomistRoot = path.join("atomist", "projects");

/**
 * Defaults for local-SDM configuration
 */
export function defaultLocalSoftwareDeliveryMachineConfiguration(
    configuration: Configuration,
    workspaceContext: LocalWorkspaceContext = DefaultWorkspaceContextResolver.workspaceContext): LocalSoftwareDeliveryMachineConfiguration {
    const automationClientFinder = defaultAutomationClientFinder();

    const defaultLocalSdmConfiguration: LocalSoftwareDeliveryMachineOptions = {
        preferLocalSeeds: true,
        mergeAutofixes: true,
        mergePullRequests: false,
        repositoryOwnerParentDirectory: determineDefaultRepositoryOwnerParentDirectory(),
        hostname: determineDefaultHostUrl(),
    };

    const localSdmConfiguration = _.merge(defaultLocalSdmConfiguration, configuration.local);

    const repoRefResolver = new ExpandedTreeRepoRefResolver(localSdmConfiguration);
    const sdmConfiguration: SoftwareDeliveryMachineOptions = {
        artifactStore: new EphemeralLocalArtifactStore(),
        projectLoader: new FileSystemProjectLoader(
            new CachingProjectLoader(),
            localSdmConfiguration),
        logFactory: async (context, goal) =>
            new SimpleNodeLoggerProgressLog(configuration.name, goal.name, path.join(os.homedir(), ".atomist", "log")),
        credentialsResolver: new EnvironmentTokenCredentialsResolver(),
        repoRefResolver,
        repoFinder: expandedTreeRepoFinder(localSdmConfiguration),
        projectPersister: fileSystemProjectPersister(workspaceContext, localSdmConfiguration, automationClientFinder),
        targets: () => new LocalRepoTargets(localSdmConfiguration),
    };

    return {
        sdm: sdmConfiguration,
        local: localSdmConfiguration,
    } as LocalSoftwareDeliveryMachineConfiguration;

}

const HostnamePath = "local.hostname";
const RepositoryOwnerParentDirectoryPath = "local.repositoryOwnerParentDirectory";

/**
 * Resolve the repositoryOwnerParentDirectory.
 * This will search in the client configuration, user config in .atomist, at ATOMIST_ROOT env var and
 * lastly default to ~/atomist/projects.
 *
 * The path will get created if it doesn't exist.
 */
export function determineDefaultRepositoryOwnerParentDirectory() {
    let root;
    try {
        root = configurationValue<string>(RepositoryOwnerParentDirectoryPath);
    } catch (err) {
        const config = getUserConfig();
        if (config) {
            root = _.get(config, RepositoryOwnerParentDirectoryPath);
        }
    }

    if (!root) {
        root = process.env.ATOMIST_ROOT || path.join(os.homedir(), DefaultAtomistRoot);
    }

    if (!fs.existsSync(root)) {
        logger.info(`Creating Atomist repository owner parent directory at '${root}'`);
        fs.mkdirSync(root, "0744");
    }

    return root;
}

/**
 * Resolve the hostname to use for calling local urls.
 * This will search in the client configuration, user config in .atomist and finally
 * default to 127.0.0.1.
 */
export function determineDefaultHostUrl() {
    try {
        return configurationValue<string>(HostnamePath);
    } catch (err) {
        const config = getUserConfig();
        if (config) {
            const hostname = _.get(config, HostnamePath);
            if (hostname) {
                return hostname;
            }
        }
    }
    return "127.0.0.1";
}
