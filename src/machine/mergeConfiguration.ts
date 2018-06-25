import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { ProjectLoader, ProjectLoadingParameters, WithLoadedProject } from "@atomist/sdm";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { EphemeralLocalArtifactStore } from "@atomist/sdm-core";
import { CachingProjectLoader } from "@atomist/sdm/api-helper/project/CachingProjectLoader";
import { execSync } from "child_process";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedDirectoryRepoFinder } from "../binding/expandedDirectoryRepoFinder";
import { dirFor } from "../binding/expandedTreeUtils";
import { fileSystemProjectPersister } from "../binding/fileSystemProjectPersister";
import { FileSystemRemoteRepoRef, isFileSystemRemoteRepoRef } from "../binding/FileSystemRemoteRepoRef";
import { LocalRepoRefResolver } from "../binding/LocalRepoRefResolver";
import { LocalTargetsParams } from "../binding/LocalTargetsParams";
import { MappedParameterResolver } from "../binding/MappedParameterResolver";
import { CliMappedParameterResolver } from "../invocation/cli/support/CliMappedParameterResolver";
import { writeToConsole } from "../invocation/cli/support/consoleOutput";
import { LocalMachineConfig } from "./LocalMachineConfig";
import { LocalSoftwareDeliveryMachineConfiguration } from "./LocalSoftwareDeliveryMachineConfiguration";

export function mergeConfiguration(
    sdmDir: string,
    userConfig: LocalMachineConfig): LocalSoftwareDeliveryMachineConfiguration {
    const repoRefResolver = new LocalRepoRefResolver(userConfig.repositoryOwnerParentDirectory);
    return {
        sdm: {
            artifactStore: new EphemeralLocalArtifactStore(),
            projectLoader: new MonkeyingProjectLoader(
                new CachingProjectLoader(),
                userConfig,
                changeToPushToAtomistBranch(userConfig.repositoryOwnerParentDirectory, userConfig.mergeAutofixes)),
            logFactory: async (context, goal) => new LoggingProgressLog(goal.name),
            credentialsResolver: EnvironmentTokenCredentialsResolver,
            repoRefResolver,
            repoFinder: expandedDirectoryRepoFinder(userConfig.repositoryOwnerParentDirectory),
            projectPersister: fileSystemProjectPersister(userConfig.repositoryOwnerParentDirectory, sdmDir),
            targets: new LocalTargetsParams(userConfig.repositoryOwnerParentDirectory),
        },
        mappedParameterResolver: new CliMappedParameterResolver(userConfig.repositoryOwnerParentDirectory),
        mergeAutofixes: true,
        ...userConfig,
    };
}

export const ResolveNothingMappedParameterResolver: MappedParameterResolver = {
    resolve: () => undefined,
};

/**
 * Project loader that performs additional steps before acting on the project
 */
class MonkeyingProjectLoader implements ProjectLoader {

    public doWithProject<T>(params: ProjectLoadingParameters, action: WithLoadedProject<T>): Promise<T> {
        // Use local seed as preference if possible
        // TODO could check if it's here
        if (this.config.preferLocalSeeds && !isFileSystemRemoteRepoRef(params.id)) {
            params.id = FileSystemRemoteRepoRef.implied(this.config.repositoryOwnerParentDirectory,
                params.id.owner, params.id.repo);
        }
        const action2 = async p => {
            const p2 = await this.monkeyWith(p);
            return action(p2);
        };
        return this.delegate.doWithProject(params, action2);
    }

    constructor(private readonly delegate: ProjectLoader,
                private readonly config: LocalMachineConfig,
                private readonly monkeyWith: (p: GitProject) => Promise<GitProject>) {
    }

}

/**
 * Change the behavior of our project to push to an Atomist branch and merge if it cannot
 * push to the checked out branch.
 * @param repositoryOwnerParentDirectory root of expanded tree
 * @param automerge whether to automatically merge the new branch
 */
function changeToPushToAtomistBranch(repositoryOwnerParentDirectory: string, automerge: boolean): (p: GitProject) => Promise<GitProject> {
    return async p => {
        p.push = async opts => {
            try {
                // First try to push this branch. If it's the checked out branch
                // We'll get an error
                writeToConsole({ message: `Pushing to branch ${p.branch} on ${p.id.owner}:${p.id.repo}`, color: "yellow" });
                execSync(`git push --force --set-upstream origin ${p.branch}`, {
                    cwd: p.baseDir,
                    stdio: "ignore",
                });
            } catch (err) {
                // If this throws an exception it's because we can't push to the checked out branch.
                // Autofix will attempt to do this.
                // So we create a new branch, push that, and then go to the original directory and merge it.
                const newBranch = `atomist/${p.branch}`;
                writeToConsole({ message: `Pushing to new local branch ${newBranch}`, color: "yellow" });
                await p.createBranch(newBranch);
                execSync(`git push --force --set-upstream origin ${p.branch}`, { cwd: p.baseDir });

                if (automerge) {
                    const originalRepoDir = dirFor(repositoryOwnerParentDirectory, p.id.owner, p.id.repo);
                    writeToConsole({ message: `Trying merge in ${originalRepoDir}`, color: "yellow" });
                    // Automerge it
                    execSync(`git merge ${newBranch}`, { cwd: originalRepoDir });
                }
            }
            return { target: p, success: true };
        };
        return p;
    };
}
