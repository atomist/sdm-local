import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { Argv } from "yargs";
import { determineCwd, withinExpandedTree } from "../../../binding/expandedTreeUtils";
import { FileSystemRemoteRepoRef } from "../../../binding/FileSystemRemoteRepoRef";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { handleGitHookEvent, HookEvents } from "../../../setup/gitHooks";
import { shaHistory } from "../../../util/git";
import { errorMessage, infoMessage, logExceptionsToConsole } from "../support/consoleOutput";

/**
 * Add a command to trigger execution following a git event
 * @param {LocalSoftwareDeliveryMachine} sdm
 * @param {yargs.Argv} yargs
 */
export function addTriggerCommand(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "trigger <event> [depth]",
        describe: "Trigger commit action on the current repository",
        builder: ra => {
            return ra.positional("event", {
                choices: HookEvents,
            }).positional("depth", {
                type: "number",
                default: 1,
            });
        },
        handler: ya => {
            return logExceptionsToConsole(() => trigger(sdm, ya.event, ya.depth));
        },
    });
}

async function trigger(sdm: LocalSoftwareDeliveryMachine, event: string, depth: number) {
    const currentDir = determineCwd();
    if (withinExpandedTree(sdm.configuration.repositoryOwnerParentDirectory, currentDir)) {
        const p = GitCommandGitProject.fromBaseDir(FileSystemRemoteRepoRef.fromDirectory({
                repositoryOwnerParentDirectory: sdm.configuration.repositoryOwnerParentDirectory,
                baseDir: currentDir,
            }),
            currentDir, null, () => null);
        const { branch } = await p.gitStatus();
        // Go back on the current branch
        const shas = (await shaHistory(p))
            .slice(0, depth)
            .reverse();
        for (const sha of shas) {
            infoMessage("Sha [%s]\n", sha);
            await handleGitHookEvent(sdm, event, { baseDir: currentDir, branch, sha });
        }
    } else {
        errorMessage(
            `Working directory ${currentDir} is not within expanded working tree under ${sdm.configuration.repositoryOwnerParentDirectory}`);
        process.exit(1);
    }
}
