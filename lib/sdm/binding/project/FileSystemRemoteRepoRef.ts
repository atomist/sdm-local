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

import {
    ActionResult,
    successOn,
} from "@atomist/automation-client/lib/action/ActionResult";
import { AbstractRemoteRepoRef } from "@atomist/automation-client/lib/operations/common/AbstractRemoteRepoRef";
import {ProjectOperationCredentials} from "@atomist/automation-client/lib/operations/common/ProjectOperationCredentials";
import {RemoteRepoRef, RepoRef} from "@atomist/automation-client/lib/operations/common/RepoId";
import { Configurable } from "@atomist/automation-client/lib/project/git/Configurable";
import {logger} from "@atomist/automation-client/lib/util/logger";
import * as path from "path";
import { runAndLog } from "../../util/runAndLog";
import {
    dirFor,
    parseOwnerAndRepo,
} from "./expandedTreeUtils";

/**
 * RemoteRepoRef working against our expanded directory structure.
 * Supports cloning and pushing.
 */
export class FileSystemRemoteRepoRef extends AbstractRemoteRepoRef {

    public kind: string = "file";

    public readonly repositoryOwnerParentDirectory: string;
    public mergePullRequests: boolean;

    public static fromDirectory(opts: {
        repositoryOwnerParentDirectory: string,
        mergePullRequests: boolean,
        baseDir: string,
        branch?: string,
        sha?: string,
    }): FileSystemRemoteRepoRef {
        const { owner, repo } = parseOwnerAndRepo(opts.repositoryOwnerParentDirectory, opts.baseDir);
        if (!owner || !repo) {
            throw new Error(`Cannot parse ${opts.repositoryOwnerParentDirectory}/owner/repo from '${opts.baseDir}'`);
        }
        return new FileSystemRemoteRepoRef({ ...opts, owner, repo });
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
                          mergePullRequests: boolean,
                          owner: string,
                          repo: string): RemoteRepoRef {
        const baseDir = dirFor(repositoryOwnerParentDirectory, owner, repo);
        return this.fromDirectory({ repositoryOwnerParentDirectory, mergePullRequests, baseDir });
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility: any): Promise<ActionResult<this>> {
        throw new Error("FileSystemRemoteRepoRef does not implement createRemote");
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        throw new Error("FileSystemRemoteRepoRef does not implement deleteRemote");
    }

    public async raisePullRequest(creds: ProjectOperationCredentials,
                                  title: string,
                                  body: string,
                                  head: string,
                                  base: string): Promise<ActionResult<this>> {
        if (this.mergePullRequests) {
            const cwd = path.join(this.repositoryOwnerParentDirectory, this.owner, this.repo);

            // 1. Checkout branch
            await runAndLog(`git checkout ${head}`, { cwd });

            // 2. Rebase from master
            await runAndLog(`git rebase ${base}`, { cwd });

            // 3. Checkout master
            await runAndLog(`git checkout ${base}`, { cwd });

            // 4. Merge branch into master
            await runAndLog(`git merge --ff-only ${head}`, { cwd });

        } else {
            logger.info(`Not merging local branch. Please set 'local.mergePullRequests' to enable merging of PR branches`);
        }
        return successOn(this);
    }

    public async setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        return undefined;
    }

    public cloneUrl(): string {
        return `file://${this.repositoryOwnerParentDirectory}/${this.owner}/${this.repo}`;
    }

    public get url(): string {
        return `file://${this.repositoryOwnerParentDirectory}/${this.owner}/${this.repo}`;
    }

    public get fileSystemLocation(): string {
        return `${this.repositoryOwnerParentDirectory}/${this.owner}/${this.repo}`;
    }

    constructor(opts: {
        repositoryOwnerParentDirectory: string,
        mergePullRequests: boolean,
        owner: string,
        repo: string,
        branch?: string,
        sha?: string,
    }) {
        super(undefined, "http://not.a.real.remote", "http://not.a.real.apiBase",
            opts.owner, opts.repo, opts.sha, undefined, opts.branch);
        this.repositoryOwnerParentDirectory = opts.repositoryOwnerParentDirectory;
        this.mergePullRequests = opts.mergePullRequests;
    }

}

export function isFileSystemRemoteRepoRef(rr: RepoRef): rr is FileSystemRemoteRepoRef {
    const maybe = rr as FileSystemRemoteRepoRef;
    return !!maybe.fileSystemLocation;
}
