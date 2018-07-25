import { logger, MappedParameter, MappedParameters, Parameter, Parameters } from "@atomist/automation-client";
import { GitBranchRegExp } from "@atomist/automation-client/operations/common/params/gitHubPatterns";
import { TargetsParams } from "@atomist/automation-client/operations/common/params/TargetsParams";
import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";
import { andFilter, RepoFilter } from "@atomist/automation-client/operations/common/repoFilter";
import { RepoTargets } from "@atomist/sdm";
import { FileSystemRemoteRepoRef } from "./FileSystemRemoteRepoRef";

@Parameters()
export class LocalRepoTargets extends TargetsParams implements RepoTargets {

    @MappedParameter(MappedParameters.GitHubApiUrl, false)
    public apiUrl: string;

    @MappedParameter(MappedParameters.GitHubOwner, false)
    public owner: string;

    @MappedParameter(MappedParameters.GitHubRepository, false)
    public repo: string;

    @Parameter({ description: "Branch or ref. Defaults to 'master'", ...GitBranchRegExp, required: false })
    public sha: string = "master";

    @Parameter({ description: "regex", required: false })
    public repos: string = ".*";

    get credentials(): ProjectOperationCredentials {
        return { token: "this.is.not.your.token.and.does.not.matter" };
    }

    /**
     * Return a single RepoRef or undefined if we're not identifying a single repo
     * @return {RepoRef}
     */
    get repoRef(): FileSystemRemoteRepoRef {
        const rr = (!!this.owner && !!this.repo && !this.usesRegex) ?
            new FileSystemRemoteRepoRef({
                repositoryOwnerParentDirectory: this.repositoryOwnerParentDirectory,
                owner: this.owner,
                repo: this.repo,
                branch: "master",
                sha: undefined,
            }) :
            undefined;
        logger.info("LocalRepoTargets returning %j: state=%j", rr, this);
        return rr;
    }

    public bindAndValidate() {
        // nothing to do
    }

    constructor(private readonly repositoryOwnerParentDirectory: string) {
        super();
        const orgFilter: RepoFilter = rr => !!this.owner ? rr.owner === this.owner : true;
        this.test = andFilter(orgFilter, super.test);
    }

}
