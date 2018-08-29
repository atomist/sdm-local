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
    ActionResult,
    successOn,
} from "@atomist/automation-client/action/ActionResult";
import { AbstractRemoteRepoRef } from "@atomist/automation-client/operations/common/AbstractRemoteRepoRef";
import { Configurable } from "@atomist/automation-client/project/git/Configurable";
import { logger } from "@atomist/sdm";
import { ProjectOperationCredentials } from "@atomist/sdm";
import {
    RemoteRepoRef,
    RepoRef,
} from "@atomist/sdm";
import {
    dirFor,
    parseOwnerAndRepo,
} from "./expandedTreeUtils";

/**
 * RemoteRepoRef displayGoalWorking against our expanded directory structure.
 * Supports cloning and pushing.
 */
export class FileSystemRemoteRepoRef extends AbstractRemoteRepoRef {

    public static fromDirectory(opts: {
        repositoryOwnerParentDirectory: string,
        baseDir: string,
        branch?: string,
        sha?: string,
    }): FileSystemRemoteRepoRef {
        const { owner, repo } = parseOwnerAndRepo(opts.repositoryOwnerParentDirectory, opts.baseDir);
        if (!(!!owner && !!repo)) {
            throw new Error(`Cannot parse ${opts.repositoryOwnerParentDirectory}/owner/repo from [${opts.baseDir}]`);
        }
        return new FileSystemRemoteRepoRef({
            repositoryOwnerParentDirectory: opts.repositoryOwnerParentDirectory,
            branch: opts.branch,
            sha: opts.sha,
            owner, repo,
        });
    }

    /**
     * Remote RepoRef for the given owner and directory. Not guaranteed
     * to exist.
     * @param {string} repositoryOwnerParentDirectory
     * @param {string} owner
     * @param {string} repo
     * @return {RemoteRepoRef}
     */
    public static implied(repositoryOwnerParentDirectory: string,
                          owner: string, repo: string): RemoteRepoRef {
        const baseDir = dirFor(repositoryOwnerParentDirectory, owner, repo);
        return this.fromDirectory({ repositoryOwnerParentDirectory, baseDir });
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility: any): Promise<ActionResult<this>> {
        throw new Error();
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        throw new Error();
    }

    public async raisePullRequest(creds: ProjectOperationCredentials,
                                  title: string,
                                  body: string,
                                  head: string,
                                  base: string): Promise<ActionResult<this>> {
        logger.info("Pull request [%s] on %s:%s", title, this.owner, this.repo);
        return successOn(this);
    }

    public async setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        return null;
    }

    public cloneUrl(): string {
        return `file://${this.repositoryOwnerParentDirectory}/${this.owner}/${this.repo}`;
    }

    public get url(): string {
        return `file:/${this.repositoryOwnerParentDirectory}/${this.owner}/${this.repo}`;
    }

    public get fileSystemLocation(): string {
        return `${this.repositoryOwnerParentDirectory}/${this.owner}/${this.repo}`;
    }

    get repositoryOwnerParentDirectory(): string {
        return this.opts.repositoryOwnerParentDirectory;
    }

    get branch(): string {
        return this.opts.branch;
    }

    // TODO this should go. It's questionable code in the SDM deploy implementation that hits it
    set branch(branch: string) {
        this.opts.branch = branch;
    }

    constructor(private readonly opts: {
        repositoryOwnerParentDirectory: string,
        owner: string,
        repo: string,
        branch: string,
        sha: string,
    }) {
        super(null, "http://not.a.real.remote",
            "http://not.a.real.apiBase",
            opts.owner, opts.repo, opts.sha);
    }

}

export function isFileSystemRemoteRepoRef(rr: RepoRef): rr is FileSystemRemoteRepoRef {
    const maybe = rr as FileSystemRemoteRepoRef;
    return !!maybe.fileSystemLocation;
}
