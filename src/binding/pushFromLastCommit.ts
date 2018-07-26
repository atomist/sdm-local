import { logger } from "@atomist/automation-client";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { CoreRepoFieldsAndChannels, OnPushToAnyBranch, PushFields } from "@atomist/sdm";
import { lastCommitMessage } from "../util/git";

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

/**
 * Make a push from the last commit to this local git project
 * @param teamId id of current team
 * @param {GitProject} project
 * @return {OnPushToAnyBranch.Push}
 */
export async function pushFromLastCommit(teamId: string, project: GitProject): Promise<OnPushToAnyBranch.Push> {
    logger.info("Git project thinks its basedir is %s, branch=%s", project.baseDir, project.branch);
    const status = await project.gitStatus();
    const repo = repoFields(teamId, project);
    const lastCommit: PushFields.Commits = {
        message: await lastCommitMessage(project),
        sha: status.sha,
    };
    return {
        id: new Date().getTime() + "_",
        branch: project.id.branch,
        repo,
        commits: [
            lastCommit,
        ],
        after: lastCommit,
    };
}
