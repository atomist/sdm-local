import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import {
    CoreRepoFieldsAndChannels,
    OnPushToAnyBranch,
    RepoRefResolver,
    ScmProvider,
    SdmGoalEvent,
} from "@atomist/sdm";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

/**
 * Resolve RepoRefs into our expanded tree structure
 */
export class ExpandedTreeRepoRefResolver implements RepoRefResolver {

    public providerIdFromPush(push: OnPushToAnyBranch.Push): string|null {
        return "local";
    }

    public repoRefFromPush(push: OnPushToAnyBranch.Push): RemoteRepoRef {
        return new FileSystemRemoteRepoRef({ repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
            owner: push.repo.owner, repo: push.repo.name, branch: push.branch, sha: push.commits[0].sha});
    }

    public repoRefFromSdmGoal(sdmGoal: SdmGoalEvent, provider: ScmProvider.ScmProvider): RemoteRepoRef {
        const repo = sdmGoal.repo;
        return new FileSystemRemoteRepoRef({ repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
            owner: repo.owner, repo: repo.name, branch: sdmGoal.branch, sha: sdmGoal.sha});
    }

    public toRemoteRepoRef(repo: CoreRepoFieldsAndChannels.Fragment, opts: { sha?: string; branch?: string }): RemoteRepoRef {
        return new FileSystemRemoteRepoRef({ repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
            owner: repo.owner, repo: repo.name, branch: opts.branch, sha: opts.sha});
    }

    constructor(public readonly repositoryOwnerParentDirectory: string) {
    }

}
