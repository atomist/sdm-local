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
    logger,
    MappedParameter,
    MappedParameters,
    Parameter,
    Parameters,
} from "@atomist/automation-client";
import { GitBranchRegExp, GitShaRegExp } from "@atomist/automation-client/operations/common/params/gitHubPatterns";
import { TargetsParams } from "@atomist/automation-client/operations/common/params/TargetsParams";
import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";
import {
    andFilter,
    RepoFilter,
} from "@atomist/automation-client/operations/common/repoFilter";
import { RepoTargets } from "@atomist/sdm";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

/**
 * Repo targeting for local use.
 */
@Parameters()
export class LocalRepoTargets extends TargetsParams implements RepoTargets {

    @MappedParameter(MappedParameters.GitHubApiUrl, false)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubOwner, false)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository, false)
    public repo: string;

    @Parameter({ description: "Branch or ref. Defaults to 'master'", ...GitBranchRegExp, required: false })
    public branch: string = "master";

    @Parameter({ description: "Sha", ...GitShaRegExp, required: false })
    public sha: string;

    @Parameter({ description: "regex", required: false })
    public repos: string = ".*";

    get credentials(): ProjectOperationCredentials {
        return { token: "this.is.not.your.token.and.does.not.matter" };
    }

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * @return {RepoRef}
     */
    get repoRef(): FileSystemRemoteRepoRef {
        const rr = (!!this.owner && !!this.repo && !this.usesRegex) ?
            new FileSystemRemoteRepoRef({
                repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
                owner: this.owner,
                repo: this.repo,
                branch: this.branch,
                sha: this.sha,
            }) :
            undefined;
        logger.debug("LocalRepoTargets returning %j: state=%j", rr, this);
        return rr;
    }

    public bindAndValidate() {
        // nothing to do
    }

    constructor(private readonly repositoryOwnerParentDirectory: string) {
        super();
        const orgFilter: RepoFilter = rr => !!this.owner ? rr.owner === this.owner : true;
        this.test = andFilter(orgFilter, super.test);
    }

}
