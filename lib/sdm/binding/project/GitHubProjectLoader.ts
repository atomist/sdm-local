import { GitCommandGitProject } from "@atomist/automation-client";
import {
    ProjectLoader,
    ProjectLoadingParameters,
    WithLoadedProject,
} from "@atomist/sdm";

export class GitHubProjectLoader implements ProjectLoader {

    constructor(private readonly delegate: ProjectLoader) {
    }

    public doWithProject<T>(params: ProjectLoadingParameters, action: WithLoadedProject<T>): Promise<T> {
        const slug = process.env.GITHUB_REPOSITORY;
        if (`${params.id.owner}/${params.id.repo}` === slug && process.env.GITHUB_WORKSPACE) {
            const project = GitCommandGitProject.fromBaseDir(
                params.id,
                process.env.GITHUB_WORKSPACE,
                params.credentials,
                async () => {
                    // intentionally left empty
                },
                );
            return action(project);
        } else {
            return this.delegate.doWithProject(params, action);
        }
    }

}
