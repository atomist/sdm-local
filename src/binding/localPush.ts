import { HandlerContext } from "@atomist/automation-client";
import { EventIncoming } from "@atomist/automation-client/internal/transport/RequestProcessor";
import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import {
    CoreRepoFieldsAndChannels, Goal, GoalImplementation,
    GoalInvocation, Goals,
    OnPushToAnyBranch,
    PushFields,
    RunWithLogContext,
    SdmGoalEvent, SdmGoalMessage, SdmGoalState,
    StatusForExecuteGoal,
} from "@atomist/sdm";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { messageClientAddressChannels } from "../invocation/cli/io/messageClientAddressChannels";
import { lastCommitMessage } from "../util/git";
import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";
import { guid } from "@atomist/automation-client/internal/util/string";
import { constructSdmGoal } from "@atomist/sdm/api-helper/goal/storeGoals";

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
export async function pushFromLastCommit(project: GitProject): Promise<OnPushToAnyBranch.Push> {
    const status = await project.gitStatus();
    const repo = repoFields(project);
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

export async function localGoalInvocation(project: GitProject,
                                             context: HandlerContext,
                                             credentials: ProjectOperationCredentials,
                                             push: PushFields.Fragment,
                                          goal: Goal,
                                          goals: Goals,
): Promise<GoalInvocation> {
    const status = await project.gitStatus();
    const repoF = repoFields(project);
    const commit: StatusForExecuteGoal.Commit = {
        sha: status.sha,
        repo: repoF,
        pushes: [
            push,
        ],
    };
    const sdmGoalMessage: SdmGoalMessage = constructSdmGoal(context, {
        goalSet: goals.name,
            goalSetId: guid(),
            goal,
            state:  SdmGoalState.requested,
            id: project.id as any as RemoteRepoRef,
            providerId: repoF.org.provider.providerId});
    const sdmGoalEvent: SdmGoalEvent = {
        ...sdmGoalMessage,
        push,
    };

    const id = project.id as any as RemoteRepoRef;
    const result: GoalInvocation = {
        sdmGoal: sdmGoalEvent,
        id,
        context, credentials,
        addressChannels: messageClientAddressChannels(id, context),
        status: {
            commit,
        },
        progressLog: new LoggingProgressLog(`${id.owner}/${id.repo}`),
    };
    return result;
}
