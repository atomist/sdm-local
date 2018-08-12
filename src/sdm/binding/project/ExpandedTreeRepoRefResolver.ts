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

import { RemoteRepoRef } from "@atomist/sdm";
import {
    CoreRepoFieldsAndChannels,
    OnPushToAnyBranch,
    RepoRefResolver,
    ScmProvider,
    SdmGoalEvent,
} from "@atomist/sdm";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

/**
 * Resolve RepoRefs into our expanded tree structure
 */
export class ExpandedTreeRepoRefResolver implements RepoRefResolver {

    public providerIdFromPush(push: OnPushToAnyBranch.Push): string|null {
        return "local";
    }

    public repoRefFromPush(push: OnPushToAnyBranch.Push): RemoteRepoRef {
        return new FileSystemRemoteRepoRef({ repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
            owner: push.repo.owner, repo: push.repo.name, branch: push.branch, sha: push.commits[0].sha});
    }

    public repoRefFromSdmGoal(sdmGoal: SdmGoalEvent, provider: ScmProvider.ScmProvider): RemoteRepoRef {
        const repo = sdmGoal.repo;
        return new FileSystemRemoteRepoRef({ repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
            owner: repo.owner, repo: repo.name, branch: sdmGoal.branch, sha: sdmGoal.sha});
    }

    public toRemoteRepoRef(repo: CoreRepoFieldsAndChannels.Fragment, opts: { sha?: string; branch?: string }): RemoteRepoRef {
        return new FileSystemRemoteRepoRef({ repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
            owner: repo.owner, repo: repo.name, branch: opts.branch, sha: opts.sha});
    }

    constructor(public readonly repositoryOwnerParentDirectory: string) {
    }

}
