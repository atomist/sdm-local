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

import { MappedParameterDeclaration } from "@atomist/automation-client/metadata/automationMetadata";
import { GitHubDotComBase } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { logger, MappedParameters } from "@atomist/sdm";
import * as os from "os";
import { DefaultWorkspaceId } from "../../../common/binding/defaultWorkspaceContextResolver";
import { MappedParameterResolver } from "../mapped-parameter/MappedParameterResolver";
import { parseOwnerAndRepo } from "./expandedTreeUtils";

/**
 * Resolve mapped parameters based on where we are in the directory tree
 * when the command was invoked.
 */
export class ExpandedTreeMappedParameterResolver implements MappedParameterResolver {

    public resolve(md: MappedParameterDeclaration): string | undefined {
        switch (md.uri) {
            case MappedParameters.GitHubRepository:
                const { repo } = parseOwnerAndRepo(this.repositoryOwnerParentDirectory);
                return repo;
            case MappedParameters.GitHubOwner:
                const { owner } = parseOwnerAndRepo(this.repositoryOwnerParentDirectory);
                return owner;
            case MappedParameters.SlackTeam:
                // TODO fix this; the SlackTeam mapped parameters is !== atomist workspace id
                return this.workspaceId;
            case MappedParameters.SlackUserName:
                return process.env.SLACK_USER_NAME || os.userInfo().username;
            case MappedParameters.GitHubWebHookUrl:
                return "http://not.a.real.url";
            case MappedParameters.GitHubApiUrl:
                return GitHubDotComBase;
            case MappedParameters.GitHubRepositoryProvider:
                return "not-a-real-provider";
            default:
                logger.warn("Mapped parameter %s not resolvable", md.uri);
                if (!md.required) {
                    return undefined;
                }
                throw new Error(`Mapped parameter ${md.uri} not resolvable`);
        }
    }

    constructor(private readonly repositoryOwnerParentDirectory: string,
        private readonly workspaceId: string = DefaultWorkspaceId) {
    }
}
