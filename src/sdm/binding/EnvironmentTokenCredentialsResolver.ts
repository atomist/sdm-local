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

import { logger } from "@atomist/automation-client";
import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";
import { CredentialsResolver } from "@atomist/sdm";

export const EnvironmentTokenCredentialsResolver: CredentialsResolver = {

    eventHandlerCredentials() {
        return credentialsFromEnvironment();
    },

    commandHandlerCredentials() {
        return credentialsFromEnvironment();
    },

};

const DefaultGitHubToken = "not.a.real.token";

function credentialsFromEnvironment(): ProjectOperationCredentials {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        logger.warn("GITHUB_TOKEN not set in environment: Defaulting to '%s'", DefaultGitHubToken);
    }
    return { token };
}
