import { MappedParameters } from "@atomist/automation-client";
import { MappedParameterDeclaration } from "@atomist/automation-client/metadata/automationMetadata";
import { GitHubDotComBase } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import * as os from "os";
import { MappedParameterResolver } from "../MappedParameterResolver";
import { parseOwnerAndRepo } from "./expandedTreeUtils";

// TODO should really have a set of enrichers,
// returning a partial function

/**
 * Resolve mapped parameters based on where we are in the directory tree
 * when the command was invoked.
 */
export class ExpandedTreeMappedParameterResolver implements MappedParameterResolver {

    public resolve(md: MappedParameterDeclaration): string | undefined {
        switch (md.uri) {
            case MappedParameters.GitHubRepository :
                const { repo } = parseOwnerAndRepo(this.repositoryOwnerParentDirectory);
                return repo;
            case MappedParameters.GitHubOwner :
                const { owner } = parseOwnerAndRepo(this.repositoryOwnerParentDirectory);
                return owner;
            case MappedParameters.SlackTeam :
                return this.atomistTeamId;
            case MappedParameters.SlackUserName :
                return process.env.SLACK_USER_NAME || os.userInfo().username;
            case MappedParameters.GitHubWebHookUrl :
                return "http://not.a.real.url";
            case MappedParameters.GitHubApiUrl :
                return GitHubDotComBase;
        }
        if (!md.required) {
            return undefined;
        }
    }

    constructor(private readonly repositoryOwnerParentDirectory: string,
                private readonly atomistTeamId: string = "T123") {
    }
}
