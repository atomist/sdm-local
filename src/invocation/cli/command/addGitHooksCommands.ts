import { Argv } from "yargs";
import { determineCwd, parseOwnerAndRepo } from "../../../binding/expandedTreeUtils";
import { FileSystemRemoteRepoRef, isFileSystemRemoteRepoRef } from "../../../binding/FileSystemRemoteRepoRef";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { addGitHooks, removeGitHooks } from "../../../setup/addGitHooks";
import { logExceptionsToConsole } from "../support/consoleOutput";
import { LocalMachineConfig } from "../../..";
import { RepoFinder } from "@atomist/automation-client/operations/common/repoFinder";
import { expandedDirectoryRepoFinder } from "../../../binding/expandedDirectoryRepoFinder";

/**
 * Command to add git hooks to current directory or all projects
 * @param {LocalSoftwareDeliveryMachine} sdm
 * @param {yargs.Argv} yargs
 */
export function addGitHooksCommands(lc: LocalMachineConfig, yargs: Argv) {
    yargs.command({
        command: "add-git-hooks",
        describe: `Install git hooks for projects under ${lc.repositoryOwnerParentDirectory}`,
        handler: () => {
            return logExceptionsToConsole(() => installHookOrHooks(lc), lc.showErrorStacks);
        },
    }).command({
        command: "remove-git-hooks",
        describe: `Remove git hooks for projects under ${lc.repositoryOwnerParentDirectory}`,
        handler: () => {
            return logExceptionsToConsole(() => removeHookOrHooks(lc), lc.showErrorStacks);
        },
    });
}

async function installHookOrHooks(lc: LocalMachineConfig) {
    const repositoryOwnerParentDirectory = lc.repositoryOwnerParentDirectory;
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory);
    if (!!owner && !!repo) {
        const rrr = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir: determineCwd(),
        });
        return addGitHooks(rrr, rrr.fileSystemLocation, lc.gitHookScript);

    }
    return installAllGitHooks(lc);
}

async function removeHookOrHooks(lc: LocalMachineConfig) {
    const repositoryOwnerParentDirectory = lc.repositoryOwnerParentDirectory;
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory);
    if (!!owner && !!repo) {
        const id = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir: determineCwd(),
        });
        return removeGitHooks(id, id.fileSystemLocation);
    }
    return removeAllGitHooks(lc);
}

/**
 * * Install git hooks in all git projects under our expanded directory structure
 * @return {Promise<void>}
 */
async function installAllGitHooks(lc: LocalMachineConfig) {
    const repoFinder = expandedDirectoryRepoFinder(lc.repositoryOwnerParentDirectory);
    const allRepos = await repoFinder(undefined);
    for (const rr of allRepos) {
        if (!isFileSystemRemoteRepoRef(rr)) {
            throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
        }
        await addGitHooks(rr, rr.fileSystemLocation, lc.gitHookScript);
    }
}

async function removeAllGitHooks(lc: LocalMachineConfig) {
    const repoFinder = expandedDirectoryRepoFinder(lc.repositoryOwnerParentDirectory);
    const allRepos = await repoFinder(undefined);
    for (const rr of allRepos) {
        if (!isFileSystemRemoteRepoRef(rr)) {
            throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
        }
        await removeGitHooks(rr, rr.fileSystemLocation);
    }
}