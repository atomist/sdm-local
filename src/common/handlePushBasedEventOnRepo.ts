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

import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { OnPushToAnyBranch } from "@atomist/sdm";
import { LocalModeConfiguration } from "@atomist/sdm-core";
import { errorMessage } from "../cli/invocation/command/support/consoleOutput";
import { pushFromLastCommit } from "../sdm/binding/event/pushFromLastCommit";
import { isAtomistTemporaryBranch } from "../sdm/binding/project/FileSystemProjectLoader";
import { FileSystemRemoteRepoRef } from "../sdm/binding/project/FileSystemRemoteRepoRef";
import { EventSender } from "./EventHandlerInvocation";
import Push = OnPushToAnyBranch.Push;

/**
 * Any event on a local repo
 */
export interface EventOnRepo {

    baseDir: string;
    branch: string;
    sha: string;
}

function validateEventOnRepo(payload: EventOnRepo): boolean {
    if (!payload) {
        // TODO return or throw exception
        errorMessage("Payload must be supplied");
        return false;
    }
    if (!payload.branch || !payload.sha || !payload.baseDir) {
        errorMessage("Invalid git hook invocation payload - branch and sha and baseDir are required: %j", payload);
        return false;
    }
    if (isAtomistTemporaryBranch(payload.branch)) {
        errorMessage("Atomist internal branch should not have triggered: %j", payload);
        return false;
    }
    if (isValidSHA1(payload.branch)) {
        errorMessage("Looks like branch has been confused with sha: %j", payload);
        return false;
    }
    if (!isValidSHA1(payload.sha)) {
        errorMessage("Invalid sha: %j", payload);
        return false;
    }
    return true;
}

export function isValidSHA1(s: string): boolean {
    return s.match(/[a-fA-F0-9]{40}/) != null;
}

/**
 * Perform push-based event handling on this repo
 * @param {EventOnRepo} payload
 * @param {string} eventHandlerName
 * @return {Promise<HandlerResult>}
 */
export async function handlePushBasedEventOnRepo(atomistTeamId: string,
                                                 sender: EventSender,
                                                 lc: LocalModeConfiguration,
                                                 payload: EventOnRepo,
                                                 eventHandlerName: string,
                                                 pushToPayload: (p: Push) => object = p => ({
                                                     Push: [p],
                                                 })) {

    // This git hook may be invoked from another git hook. This will cause these values to
    // be incorrect, so we need to delete them to have git work them out again from the directory we're passing via cwd
    // https://stackoverflow.com/questions/3542854/calling-git-pull-from-a-git-post-update-hook
    delete process.env.GIT_DIR;
    delete process.env.GIT_WORK_TREE;

    if (!validateEventOnRepo(payload)) {
        return;
    }

    const push = await createPush(atomistTeamId, lc.repositoryOwnerParentDirectory, payload);
    return sender({
        name: eventHandlerName,
        payload: pushToPayload(push),
    });
}

async function createPush(teamId: string, repositoryOwnerParentDirectory: string, payload: EventOnRepo): Promise<OnPushToAnyBranch.Push> {
    const { baseDir, branch, sha } = payload;
    return doWithProjectUnderExpandedDirectoryTree(baseDir, branch, sha, repositoryOwnerParentDirectory,
        async p => {
            return pushFromLastCommit(teamId, p);
        });
}

async function doWithProjectUnderExpandedDirectoryTree(baseDir: string,
                                                       branch: string,
                                                       sha: string,
                                                       repositoryOwnerParentDirectory: string,
                                                       action: (p: GitProject) => Promise<any>) {
    const p = GitCommandGitProject.fromBaseDir(
        FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir, branch, sha,
        }),
        baseDir,
        {},
        () => null);
    return action(p);
}
