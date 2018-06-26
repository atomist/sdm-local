import { logger } from "@atomist/automation-client";
import { ActionResult, successOn } from "@atomist/automation-client/action/ActionResult";
import { AbstractRemoteRepoRef } from "@atomist/automation-client/operations/common/AbstractRemoteRepoRef";
import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";
import { RemoteRepoRef, RepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { Configurable } from "@atomist/automation-client/project/git/Configurable";
import { dirFor, parseOwnerAndRepo } from "./expandedTreeUtils";

/**
 * RemoteRepoRef displayGoalWorking against our expanded directory structure.
 * Supports cloning and pushing.
 */
export class FileSystemRemoteRepoRef extends AbstractRemoteRepoRef {

    public static fromDirectory(opts: {
        repositoryOwnerParentDirectory: string,
        baseDir: string,
        branch?: string,
        sha?: string,
    }): RemoteRepoRef {
        const { owner, repo } = parseOwnerAndRepo(opts.repositoryOwnerParentDirectory, opts.baseDir);
        if (!(!!owner && !!repo)) {
            throw new Error(`Cannot resolve directory ${opts.baseDir}`);
        }
        return new FileSystemRemoteRepoRef({
            repositoryOwnerParentDirectory: opts.repositoryOwnerParentDirectory,
            branch: opts.branch,
            sha: opts.sha,
            owner, repo,
        });
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
                          owner: string, repo: string): RemoteRepoRef {
        const baseDir = dirFor(repositoryOwnerParentDirectory, owner, repo);
        return this.fromDirectory({ repositoryOwnerParentDirectory, baseDir});
    }

    public createRemote(creds: ProjectOperationCredentials, description: string, visibility): Promise<ActionResult<this>> {
        throw new Error();
    }

    public deleteRemote(creds: ProjectOperationCredentials): Promise<ActionResult<this>> {
        throw new Error();
    }

    public async raisePullRequest(creds: ProjectOperationCredentials,
                                  title: string,
                                  body: string,
                                  head: string,
                                  base: string): Promise<ActionResult<this>> {
        logger.info("Pull request [%s] on %s:%s", title, this.owner, this.repo);
        return successOn(this);
    }

    public async setUserConfig(credentials: ProjectOperationCredentials, project: Configurable): Promise<ActionResult<any>> {
        return null;
    }

    public cloneUrl(): string {
        return `file://${this.repositoryOwnerParentDirectory}/${this.owner}/${this.repo}`;
    }

    public get fileSystemLocation(): string {
        return `${this.repositoryOwnerParentDirectory}/${this.owner}/${this.repo}`;
    }

    get repositoryOwnerParentDirectory(): string {
        return this.opts.repositoryOwnerParentDirectory;
    }

    get branch(): string {
        return this.opts.branch;
    }

    // TODO this should go. It's questionable code in the SDM deploy implementation that hits it
    set branch(branch: string) {
        this.opts.branch = branch;
    }

    constructor(private readonly opts: {
        repositoryOwnerParentDirectory: string,
        owner: string,
        repo: string,
        branch: string,
        sha: string,
    }) {
        super(null, "http://not.a.real.remote",
            "http://not.a.real.apiBase",
            opts.owner, opts.repo, opts.sha);
    }

}

export function isFileSystemRemoteRepoRef(rr: RepoRef): rr is FileSystemRemoteRepoRef {
    const maybe = rr as FileSystemRemoteRepoRef;
    return !!maybe.fileSystemLocation;
}
