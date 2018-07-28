import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { CoreRepoFieldsAndChannels, OnPushToAnyBranch, PushFields, PushForSdmGoal } from "@atomist/sdm";
import { commitMessageForSha, retrieveLogDataForSha, shaHistory, timestampFromCommit } from "../util/git";
import Author = PushForSdmGoal.Author;
import Before = PushForSdmGoal.Before;
import After = PushFields.After;
import Committer = PushForSdmGoal.Committer;

function repoFields(teamId: string, project: GitProject): CoreRepoFieldsAndChannels.Fragment {
    return {
        owner: project.id.owner,
        name: project.id.repo,
        org: {
            provider: {
                providerType: "github_com" as any,
                apiUrl: "just.not.there",
                url: "and.nor.is.this",
                providerId: "foo",
            },
        },
        channels: [
            {
                name: project.id.repo,
                id: project.id.repo,
                team: { id: teamId },
            },
        ],
    };
}

async function authorFromCommit(sha: string, project: GitProject): Promise<Author> {
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
    const repo = repoFields(teamId, project);
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
