import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { CoreRepoFieldsAndChannels, OnPushToAnyBranch, RepoRefResolver, ScmProvider } from "@atomist/sdm";
import { SdmGoal } from "@atomist/sdm/api/goal/SdmGoal";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

export class LocalRepoRefResolver implements RepoRefResolver {

    public providerIdFromPush(push: OnPushToAnyBranch.Push): string|null {
        return "local";
    }

    public repoRefFromPush(push: OnPushToAnyBranch.Push): RemoteRepoRef {
        return new FileSystemRemoteRepoRef({ repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
            owner: push.repo.owner, repo: push.repo.name, branch: push.branch, sha: push.commits[0].sha});
    }

    public repoRefFromSdmGoal(sdmGoal: SdmGoal, provider: ScmProvider.ScmProvider): RemoteRepoRef {
        throw new Error("not implemented");
    }

    public toRemoteRepoRef(repo: CoreRepoFieldsAndChannels.Fragment, opts: { sha?: string; branch?: string }): RemoteRepoRef {
        return new FileSystemRemoteRepoRef({ repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
            owner: repo.owner, repo: repo.name, branch: opts.branch, sha: opts.sha});
    }

    constructor(public readonly repositoryOwnerParentDirectory: string) {
    }

}
