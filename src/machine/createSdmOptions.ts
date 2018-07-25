import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { ProjectLoader, ProjectLoadingParameters, SoftwareDeliveryMachineOptions, WithLoadedProject } from "@atomist/sdm";
import { EphemeralLocalArtifactStore } from "@atomist/sdm-core";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";
import { CachingProjectLoader } from "@atomist/sdm/api-helper/project/CachingProjectLoader";
import { exec, execSync } from "child_process";
import * as fs from "fs";
import { promisify } from "util";
import { EnvironmentTokenCredentialsResolver } from "../binding/EnvironmentTokenCredentialsResolver";
import { expandedTreeRepoFinder } from "../binding/expandedTreeRepoFinder";
import { dirFor } from "../binding/expandedTreeUtils";
import { fileSystemProjectPersister } from "../binding/fileSystemProjectPersister";
import { FileSystemRemoteRepoRef, isFileSystemRemoteRepoRef } from "../binding/FileSystemRemoteRepoRef";
import { LocalRepoRefResolver } from "../binding/LocalRepoRefResolver";
import { LocalRepoTargets } from "../binding/LocalRepoTargets";
import { infoMessage } from "../invocation/cli/support/consoleOutput";
import { LocalMachineConfig } from "./LocalMachineConfig";

/**
 * Merge user-supplied configuration with defaults
 * to provide configuration for a local-mode SDM
 * @param {LocalMachineConfig} userConfig
 */
export function createSdmOptions(userConfig: LocalMachineConfig): SoftwareDeliveryMachineOptions {
    const repoRefResolver = new LocalRepoRefResolver(userConfig.repositoryOwnerParentDirectory);
    return {
        // TODO this is the only use of sdm-core
        artifactStore: new EphemeralLocalArtifactStore(),
        projectLoader: new DecoratingProjectLoader(
            new CachingProjectLoader(),
            userConfig,
            changeToPushToAtomistBranch(userConfig.repositoryOwnerParentDirectory, userConfig.mergeAutofixes)),
        logFactory: async (context, goal) => new LoggingProgressLog(goal.name),
        credentialsResolver: EnvironmentTokenCredentialsResolver,
        repoRefResolver,
        repoFinder: expandedTreeRepoFinder(userConfig.repositoryOwnerParentDirectory),
        projectPersister: fileSystemProjectPersister(userConfig.repositoryOwnerParentDirectory),
        targets: () => new LocalRepoTargets(userConfig.repositoryOwnerParentDirectory),
    };
}

/**
 * Project loader that performs additional steps before acting on the project
 */
class DecoratingProjectLoader implements ProjectLoader {

    public doWithProject<T>(params: ProjectLoadingParameters, action: WithLoadedProject<T>): Promise<T> {
        // Use local seed as preference if possible
        const localDir = dirFor(this.config.repositoryOwnerParentDirectory, params.id.owner, params.id.repo);
        const foundLocally = fs.existsSync(localDir);
        if (this.config.preferLocalSeeds && !isFileSystemRemoteRepoRef(params.id) && foundLocally) {
            params.id = FileSystemRemoteRepoRef.implied(this.config.repositoryOwnerParentDirectory,
                params.id.owner, params.id.repo);
        }
        const decoratedAction = async p => {
            const p2 = await this.preprocess(p);
            return action(p2);
        };
        return this.delegate.doWithProject(params, decoratedAction);
    }

    constructor(private readonly delegate: ProjectLoader,
                private readonly config: LocalMachineConfig,
                private readonly preprocess: (p: GitProject) => Promise<GitProject>) {
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
                infoMessage(`Pushing to branch ${p.branch} on ${p.id.owner}:${p.id.repo}\n`);
                await promisify(exec)(`git push --force --set-upstream origin ${p.branch}`, {
                    cwd: p.baseDir,
                    // stdio: "ignore",
                });
            } catch (err) {
                // If this throws an exception it's because we can't push to the checked out branch.
                // Autofix will attempt to do this.
                // So we create a new branch, push that, and then go to the original directory and merge it.
                const newBranch = `atomist/${p.branch}`;
                infoMessage(`Pushing to new local branch ${newBranch}\n`);
                await p.createBranch(newBranch);
                execSync(`git push --force --set-upstream origin ${p.branch}`, { cwd: p.baseDir });

                if (automerge) {
                    const originalRepoDir = dirFor(repositoryOwnerParentDirectory, p.id.owner, p.id.repo);
                    // infoMessage(`Trying merge in ${originalRepoDir}\n`);
                    // Automerge it
                    await promisify(exec)(`git merge ${newBranch}`, { cwd: originalRepoDir });
                }
            }
            return { target: p, success: true };
        };
        return p;
    };
}
