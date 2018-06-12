import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { ProjectLoader, ProjectLoadingParameters, WithLoadedProject } from "@atomist/sdm";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { EphemeralLocalArtifactStore } from "@atomist/sdm/internal/artifact/local/EphemeralLocalArtifactStore";
import { CachingProjectLoader } from "@atomist/sdm/project/CachingProjectLoader";
import { execSync } from "child_process";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedDirectoryRepoFinder } from "../binding/expandedDirectoryRepoFinder";
import { fileSystemProjectPersister } from "../binding/fileSystemProjectPersister";
import { LocalRepoRefResolver } from "../binding/LocalRepoRefResolver";
import { LocalTargetsParams } from "../binding/LocalTargetsParams";
import { MappedParameterResolver } from "../binding/MappedParameterResolver";
import { writeToConsole } from "../invocation/cli/support/consoleOutput";
import { LocalSoftwareDeliveryMachineConfiguration } from "./LocalSoftwareDeliveryMachineConfiguration";
import { dirFor } from "../binding/expandedTreeUtils";

export function loadConfiguration(
    repositoryOwnerParentDirectory: string,
    mappedParameterResolver: MappedParameterResolver = ResolveNothingMappedParameterResolver): LocalSoftwareDeliveryMachineConfiguration {
    const repoRefResolver = new LocalRepoRefResolver(repositoryOwnerParentDirectory);
    return {
        sdm: {
            artifactStore: new EphemeralLocalArtifactStore(),
            projectLoader: new MonkeyingProjectLoader(
                new CachingProjectLoader(),
                changeToPushToAtomistBranch(repositoryOwnerParentDirectory)),
            logFactory: async (context, goal) => new LoggingProgressLog(goal.name),
            credentialsResolver: EnvironmentTokenCredentialsResolver,
            repoRefResolver,
            repoFinder: expandedDirectoryRepoFinder(repositoryOwnerParentDirectory),
            projectPersister: fileSystemProjectPersister(repositoryOwnerParentDirectory),
            targets: new LocalTargetsParams(repositoryOwnerParentDirectory),
        },
        repositoryOwnerParentDirectory,
        mappedParameterResolver,
    };
}

const ResolveNothingMappedParameterResolver: MappedParameterResolver = {
    resolve: () => undefined,
};

/**
 * Project loader that performs additional steps before acting on the project
 */
class MonkeyingProjectLoader implements ProjectLoader {

    public doWithProject<T>(params: ProjectLoadingParameters, action: WithLoadedProject<T>): Promise<T> {
        const action2 = async p => {
            const p2 = await this.monkeyWith(p);
            return action(p2);
        };
        return this.delegate.doWithProject(params, action2);
    }

    constructor(private readonly delegate: ProjectLoader,
                private readonly monkeyWith: (p: GitProject) => Promise<GitProject>) {
    }

}

/**
 * Change the behavior of our project to push to an Atomist branch and merge if it cannot
 * push to the checked out branch.
 */
function changeToPushToAtomistBranch(repositoryOwnerParentDirectory: string): (p: GitProject) => Promise<GitProject> {
    return async p => {
        p.push = async opts => {
            try {
                // First try to push this branch. If it's the checked out branch
                // We'll get an error
                writeToConsole({ message: `Pushing to branch ${p.branch}`, color: "yellow" });
                execSync(`git push --force --set-upstream origin ${p.branch}`, { cwd: p.baseDir });
            } catch (err) {
                // If this throws an exception it's because we can't push to the checked out branch.
                // Autofix will attempt to do this.
                // So we create a new branch, push that, and then go to the original directory and merge it.
                const newBranch = `atomist/${p.branch}`;
                writeToConsole({ message: `Pushing to new local branch ${newBranch}`, color: "yellow" });
                await p.createBranch(newBranch);
                execSync(`git push --force --set-upstream origin ${p.branch}`, { cwd: p.baseDir });

                const originalRepoDir = dirFor(repositoryOwnerParentDirectory, p.id.owner, p.id.repo);
                writeToConsole({message: `Trying merge in ${originalRepoDir}`, color: "yellow"});
                // Automerge it
                execSync(`git merge ${newBranch}`, { cwd: originalRepoDir });
            }
            return { target: p, success: true };
        };
        return p;
    };
}
