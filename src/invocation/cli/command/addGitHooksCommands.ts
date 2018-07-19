import { Argv } from "yargs";
import { determineCwd, parseOwnerAndRepo } from "../../../binding/expandedTreeUtils";
import { FileSystemRemoteRepoRef } from "../../../binding/FileSystemRemoteRepoRef";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { removeGitHooks } from "../../../setup/addGitHooks";
import { logExceptionsToConsole } from "../support/consoleOutput";

/**
 * Command to add git hooks to current directory or all projects
 * @param {LocalSoftwareDeliveryMachine} sdm
 * @param {yargs.Argv} yargs
 */
export function addGitHooksCommands(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "add-git-hooks",
        describe: `Install git hooks for projects under ${sdm.configuration.repositoryOwnerParentDirectory}`,
        handler: () => {
            return logExceptionsToConsole(() => installHookOrHooks(sdm), sdm.configuration.showErrorStacks);
        },
    }).command({
        command: "remove-git-hooks",
        describe: `Remove git hooks for projects under ${sdm.configuration.repositoryOwnerParentDirectory}`,
        handler: () => {
            return logExceptionsToConsole(() => removeHookOrHooks(sdm), sdm.configuration.showErrorStacks);
        },
    });
}

async function installHookOrHooks(sdm: LocalSoftwareDeliveryMachine) {
    const repositoryOwnerParentDirectory = sdm.configuration.repositoryOwnerParentDirectory;
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory);
    if (!!owner && !!repo) {
       return sdm.installGitHooksFor(FileSystemRemoteRepoRef.fromDirectory({
           repositoryOwnerParentDirectory,
           baseDir: determineCwd(),
       }));
    }
    return sdm.installGitHooks();
}

async function removeHookOrHooks(sdm: LocalSoftwareDeliveryMachine) {
    const repositoryOwnerParentDirectory = sdm.configuration.repositoryOwnerParentDirectory;
    const { owner, repo } = parseOwnerAndRepo(repositoryOwnerParentDirectory);
    if (!!owner && !!repo) {
        const id = FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir: determineCwd(),
        });
        return removeGitHooks(id, id.fileSystemLocation);
    }
    return sdm.removeGitHooks();
}
