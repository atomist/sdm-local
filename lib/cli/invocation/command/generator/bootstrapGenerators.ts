/*
 * Copyright © 2019 Atomist, Inc.
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

import { GitHubRepoRef } from "@atomist/automation-client/lib/operations/common/GitHubRepoRef";
import { RemoteRepoRef } from "@atomist/automation-client/lib/operations/common/RepoId";
import {
    CodeTransform,
    GeneratorRegistration,
} from "@atomist/sdm";
import { validationPatterns } from "@atomist/sdm/lib/client/index";
import {
    NodeProjectCreationParameters,
    NodeProjectCreationParametersDefinition,
} from "./NodeProjectCreationParameters";
import { UpdatePackageJsonIdentification } from "./updatePackageJsonIdentification";

/**
 * Generator that can create a new Node project. Parameterized
 * by name, starting point and tags.
 */
export function nodeGenerator(name: string,
                              startingPoint: RemoteRepoRef,
                              transforms: Array<CodeTransform<any>> = [UpdatePackageJsonIdentification],
                              ...tags: string[]): GeneratorRegistration<NodeProjectCreationParameters> {
    return {
        name,
        startingPoint,
        parameters: NodeProjectCreationParametersDefinition,
        transform: [
            ...transforms,
        ],
        tags,
    };
}

/**
 * Creates a new repo based on the content of an existing repo
 * without making any changes
 */
export const superforkGenerator: GeneratorRegistration<{ owner: string, repo: string }> = {
    name: "superfork",
    startingPoint: params => new GitHubRepoRef(params.owner, params.repo),
    parameters: {
        owner: { ...validationPatterns.GitHubNameRegExp, description: "GitHub owner" },
        repo: { ...validationPatterns.GitHubNameRegExp, description: "GitHub repo" },
    },
    transform: async p => p,
};
