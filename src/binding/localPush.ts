import { HandlerContext } from "@atomist/automation-client";
import { EventIncoming } from "@atomist/automation-client/internal/transport/RequestProcessor";
import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { CoreRepoFieldsAndChannels, OnPushToAnyBranch, RunWithLogContext, StatusForExecuteGoal } from "@atomist/sdm";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { messageClientAddressChannels } from "../invocation/cli/io/messageClientAddressChannels";
import { LocalHandlerContext } from "./LocalHandlerContext";

function repoFields(project: GitProject): CoreRepoFieldsAndChannels.Fragment {
    return {
        owner: project.id.owner,
        name: project.id.repo,
        org: {
            provider: {
                // TODO why do we need this?
                providerType: "github_com" as any,
                apiUrl: "just.not.there",
                url: "and.nor.is.this",
                providerId: "foo",
            },
        },
        channels: [],
    };
}

/**
 * Make a push from the last commit to this local git project
 * @param {GitProject} project
 * @return {OnPushToAnyBranch.Push}
 */
async function pushFromLastCommit(project: GitProject): Promise<OnPushToAnyBranch.Push> {
    const status = await project.gitStatus();
    const repo = repoFields(project);
    return {
        id: new Date().getTime() + "_",
        branch: project.branch,
        repo,
        commits: [
            {
                sha: status.sha,
            },
        ],
        after: {
            // TODO take from the commit
            sha: status.sha,
            // TODO message from the commit
        },
    };
}

/**
 * Core invocation fields
 * @return {SdmContext}
 */
function coreInvocation(context: HandlerContext) {
    return {
        context,
        credentials: {token: "ABCD"},
    };
}

export async function localRunWithLogContext(project: GitProject): Promise<RunWithLogContext> {
    const status = await project.gitStatus();
    const commit: StatusForExecuteGoal.Commit = {
        sha: status.sha,
        repo: repoFields(project),
        pushes: [
            await pushFromLastCommit(project),
        ],
    };
    const trigger = {} as EventIncoming;
    const context = new LocalHandlerContext(trigger);
    const id = project.id as any as RemoteRepoRef;
    return {
        id,
        ...coreInvocation(context),
        addressChannels: messageClientAddressChannels(id, context),
        status: {
            commit,
        },
        progressLog: new LoggingProgressLog(`${id.owner}/${id.repo}`),
    };
}
