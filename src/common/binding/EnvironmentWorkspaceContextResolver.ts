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
    getUserConfig,
    resolveWorkspaceIds,
} from "@atomist/automation-client";
import * as _ from "lodash";
import * as os from "os";
import { LocalWorkspaceContext } from "../invocation/LocalWorkspaceContext";
import { WorkspaceContextResolver } from "./WorkspaceContextResolver";

export const DefaultWorkspaceId = "local";

/**
 * Resolve team from the environment, within CLI
 */
export class EnvironmentWorkspaceContextResolver implements WorkspaceContextResolver {

    public get workspaceContext(): LocalWorkspaceContext {
        const configuration: Configuration = getUserConfig() || {};

        // This resolves workspaceIds from env variables or user configuration.
        resolveWorkspaceIds(configuration);

        if (!_.isEmpty(configuration.workspaceIds)) {
            return {
                workspaceId: configuration.workspaceIds[0],
                workspaceName: os.hostname(),
            };
        } else {
            return {
                workspaceId: DefaultWorkspaceId,
                workspaceName: os.hostname(),
            };
        }
    }
}
