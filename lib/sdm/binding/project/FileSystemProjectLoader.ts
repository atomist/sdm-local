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
    ProjectLoader,
    ProjectLoadingParameters,
    WithLoadedProject,
} from "@atomist/sdm";
import * as fs from "fs";
import * as _ from "lodash";
import { logAndSend } from "../../../common/ui/httpMessaging";
import { runAndLog } from "../../util/runAndLog";
import { dirFor } from "./expandedTreeUtils";
import {
    FileSystemRemoteRepoRef,
    isFileSystemRemoteRepoRef,
} from "./FileSystemRemoteRepoRef";
import { GitProject, logger } from "@atomist/sdm/lib/client";
import { LocalSoftwareDeliveryMachineOptions } from "@atomist/sdm/lib/core";

/**
 * Local project loader backed by expanded directory tree.
 * Modifies push behavior before acting on project,
 * and prefers local directories if found on disk
 */
export class FileSystemProjectLoader implements ProjectLoader {

    public doWithProject<T>(params: ProjectLoadingParameters, action: WithLoadedProject<T>): Promise<T> {
        // Use local seed as preference if possible
        const localDir = dirFor(this.opts.repositoryOwnerParentDirectory, params.id.owner, params.id.repo);
        const foundLocally = fs.existsSync(localDir);
        if (this.opts.preferLocalSeeds && !isFileSystemRemoteRepoRef(params.id) && foundLocally) {
            params.id = FileSystemRemoteRepoRef.implied(
                this.opts.repositoryOwnerParentDirectory,
                this.opts.mergePullRequests,
                params.id.owner,
                params.id.repo);
        }
        const decoratedAction: (p: GitProject) => Promise<T> = async p => {
            const p2 = await this.preprocess(p);
            return action(p2);
        };
        // It's trickier to clone a file:// repo with --depth, and that optimization is less impactful
        // on the local filesystem anyway, so don't try to use it. Clone deeply.
        _.set(params, "cloneOptions.alwaysDeep", true);
        return this.delegate.doWithProject(params, decoratedAction);
    }

    constructor(private readonly delegate: ProjectLoader,
                private readonly opts: LocalSoftwareDeliveryMachineOptions,
                private readonly preprocess: (p: GitProject) => Promise<GitProject> = changeToPushToAtomistBranch(opts)) {
    }

}

const AtomistTemporaryBranch = "atomist-internal";

/**
 * Create a branch that will be used internally only
 * @param {string} branch
 * @return {string}
 */
function atomistTemporaryBranchFor(branch: string): string {
    return `${AtomistTemporaryBranch}/${branch}`;
}

export function isAtomistTemporaryBranch(branch: string): boolean {
    return branch.includes(AtomistTemporaryBranch);
}

/**
 * Change the behavior of our project to push to an Atomist branch and merge if it cannot
 * push to the checked out branch.
 */
function changeToPushToAtomistBranch(localConfig: LocalSoftwareDeliveryMachineOptions): (p: GitProject) => Promise<GitProject> {
    return async p => {
        p.push = async opts => {
            try {
                // First try to push this branch. If it's the checked out branch
                // we'll get an error
                await logAndSend(`Trying to push to branch ${p.branch} on ${p.id.owner}:${p.id.repo} in ${p.baseDir}`);
                await runAndLog(`git push --force --set-upstream origin ${p.branch}`, {
                    cwd: p.baseDir,
                });
            } catch (err) {
                // If this throws an exception it's because we can't push to the checked out branch.
                // Autofix will attempt to do this.
                // So we create a new branch, push that, and then go to the original directory and merge it.
                const newBranch = atomistTemporaryBranchFor(p.branch);
                await logAndSend(`Pushing to new local branch ${newBranch} after error`);
                await p.createBranch(newBranch);
                // We disable verify to stop our git hooks running on this
                await runAndLog(`git push --force --no-verify --set-upstream origin ${p.branch}`, { cwd: p.baseDir });

                if (localConfig.mergeAutofixes) {
                    const originalRepoDir = dirFor(localConfig.repositoryOwnerParentDirectory, p.id.owner, p.id.repo);
                    logger.info("Trying merge in %s", originalRepoDir);
                    // Automerge it
                    await runAndLog(`git merge ${newBranch}`, { cwd: originalRepoDir });
                }
            }
            return p;
        };
        return p;
    };
}
