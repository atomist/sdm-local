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

import { GitCommandGitProject } from "@atomist/automation-client";
import {
    ProjectLoader,
    ProjectLoadingParameters,
    WithLoadedProject,
} from "@atomist/sdm";

export class GitHubProjectLoader implements ProjectLoader {

    constructor(private readonly delegate: ProjectLoader) {
    }

    public doWithProject<T>(params: ProjectLoadingParameters, action: WithLoadedProject<T>): Promise<T> {
        const slug = process.env.GITHUB_REPOSITORY;
        if (`${params.id.owner}/${params.id.repo}` === slug && process.env.GITHUB_WORKSPACE) {
            const project = GitCommandGitProject.fromBaseDir(
                params.id,
                process.env.GITHUB_WORKSPACE,
                params.credentials,
                async () => {
                    // intentionally left empty
                },
                );
            return action(project);
        } else {
            return this.delegate.doWithProject(params, action);
        }
    }

}
