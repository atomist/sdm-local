import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { Argv } from "yargs";
import { determineCwd, withinExpandedTree } from "../../../binding/expandedTreeUtils";
import { FileSystemRemoteRepoRef } from "../../../binding/FileSystemRemoteRepoRef";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { GitHookEvent } from "../../git/onGitHook";
import { logExceptionsToConsole, writeToConsole } from "../support/consoleOutput";

// TODO add which trigger
export function addTriggerCommand(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "trigger",
        describe: "Trigger commit action on the current repository",
        handler: () => {
            return logExceptionsToConsole(() => trigger(sdm));
        },
    });
}

async function trigger(sdm: LocalSoftwareDeliveryMachine, event: GitHookEvent = "postCommit") {
    const currentDir = determineCwd();
    if (withinExpandedTree(sdm.configuration.repositoryOwnerParentDirectory, currentDir)) {
        const p = GitCommandGitProject.fromBaseDir(FileSystemRemoteRepoRef.fromDirectory(
            sdm.configuration.repositoryOwnerParentDirectory,
            currentDir,
            "master",
            undefined,
            ),
            currentDir, null, () => null);
        const { branch, sha } = await p.gitStatus();
        return sdm[event](currentDir, branch, sha);
    } else {
        writeToConsole({
            message: `Working directory ${currentDir} is not within expanded working tree under ${sdm.configuration.repositoryOwnerParentDirectory}`,
            color: "red",
        });
        process.exit(1);
    }
}
