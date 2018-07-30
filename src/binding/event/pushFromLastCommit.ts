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


import { RepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { LocalProject } from "@atomist/automation-client/project/local/LocalProject";
import {
    CoreRepoFieldsAndChannels,
    OnPushToAnyBranch,
    OwnerType,
    PushFields,
    PushForSdmGoal,
} from "@atomist/sdm";
import {
    commitMessageForSha,
    retrieveLogDataForSha,
    shaHistory,
    timestampFromCommit,
} from "../../util/git";
import After = PushFields.After;
import Author = PushForSdmGoal.Author;
import Before = PushForSdmGoal.Before;
import Committer = PushForSdmGoal.Committer;

export function repoFieldsFromProject(teamId: string, id: RepoRef): CoreRepoFieldsAndChannels.Fragment {
    return {
        owner: id.owner,
        name: id.repo,
        org: {
            owner: id.owner,
            ownerType: "organization" as OwnerType,
            provider: {
                providerType: "github_com" as any,
                apiUrl: "just.not.there",
                url: "and.nor.is.this",
                providerId: "foo",
            },
        },
        channels: [
            {
                name: id.repo,
                id: id.repo,
                team: { id: teamId },
            },
        ],
        // TODO hardcoded
        defaultBranch: "master",
    };
}

async function authorFromCommit(sha: string, project: LocalProject): Promise<Author> {
    const result = await retrieveLogDataForSha(sha , project.baseDir, "an");
    return {
        name: result.an,
        login: result.an,
    };
}

async function committerFromCommit(sha: string, project: GitProject): Promise<Committer> {
    const result = await retrieveLogDataForSha(sha , project.baseDir, "cn", "cN", "ce");
    return {
        login: result.cn,
        person: {
            chatId: {
                screenName: result.cN,
            },
            gitHubId: {
                login: result.cn,
            },
            forename: "",
            surname: result.cn,
            name: result.cn,
            emails: [{
                address: result.ce,
            }],
        },
    };
}

/**
 * Build an Atomist commit structure from the given sha
 * @param {string} sha
 * @param {GitProject} project
 * @return {Promise<PushFields.Commits & PushForSdmGoal.Before & PushFields.After>}
 */
async function buildCommitFromSha(sha: string, project: GitProject): Promise<PushFields.Commits & Before & After> {
    return {
        message: await commitMessageForSha(sha, project),
        sha,
        committer: await committerFromCommit(sha, project),
        author: await authorFromCommit(sha, project),
        timestamp: await timestampFromCommit(sha, project),
    };
}

/**
 * Make a push to send to the Atomist event endpoint from the last commit to this local git project.
 * @param teamId id of current team
 * @param {GitProject} project
 * @return {OnPushToAnyBranch.Push}
 */
export async function pushFromLastCommit(teamId: string, project: GitProject): Promise<OnPushToAnyBranch.Push> {
    const status = await project.gitStatus();
    const repo = repoFieldsFromProject(teamId, project.id);
    const lastCommit = await buildCommitFromSha(status.sha, project);
    const lastShas = await shaHistory(project);
    const penultimateCommit = (!!lastShas && lastShas.length >= 2) ?
        await buildCommitFromSha(lastShas[1], project) :
        undefined;
    return {
        id: new Date().getTime() + "_",
        branch: project.id.branch,
        repo,
        commits: [
            lastCommit,
        ],
        after: lastCommit,
        before: penultimateCommit,
        timestamp: lastCommit.timestamp,
    };
}
