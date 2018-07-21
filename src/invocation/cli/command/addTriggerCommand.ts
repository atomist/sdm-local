import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { Argv } from "yargs";
import { determineCwd, withinExpandedTree } from "../../../binding/expandedTreeUtils";
import { FileSystemRemoteRepoRef } from "../../../binding/FileSystemRemoteRepoRef";
import { handleGitHookEvent, HookEvents } from "../../../setup/gitHooks";
import { shaHistory } from "../../../util/git";
import { errorMessage, infoMessage, logExceptionsToConsole } from "../support/consoleOutput";
import { logger } from "@atomist/automation-client";
import { AutomationClientInfo } from "../../config";

/**
 * Add a command to trigger execution following a git event
 * @param {yargs.Argv} yargs
 */
export function addTriggerCommand(ai: AutomationClientInfo, yargs: Argv) {
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
            return logExceptionsToConsole(() => trigger(ai, ya.event, ya.depth), ai.localConfig.showErrorStacks);
        },
    });
}

async function trigger(ai: AutomationClientInfo, event: string, depth: number) {
    const currentDir = determineCwd();
    if (withinExpandedTree(ai.localConfig.repositoryOwnerParentDirectory, currentDir)) {
        const p = GitCommandGitProject.fromBaseDir(FileSystemRemoteRepoRef.fromDirectory({
                repositoryOwnerParentDirectory: ai.localConfig.repositoryOwnerParentDirectory,
                baseDir: currentDir,
            }),
            currentDir, null, () => null);
        logger.info("Trigger %s within [%s], depth=%d", event, currentDir, depth);
        const { branch } = await p.gitStatus();
        // Go back on the current branch
        const shas = (await shaHistory(p))
            .slice(0, depth)
            .reverse();
        for (const sha of shas) {
            if (depth > 1) {
                infoMessage("Sha [%s]\n", sha);
            }
            const invocation = { event, baseDir: currentDir, branch, sha };
            logger.info("Trigger %j", invocation);
            await handleGitHookEvent(ai, invocation);
        }
    } else {
        errorMessage(
            `Working directory ${currentDir} is not within expanded working tree under ${ai.localConfig.repositoryOwnerParentDirectory}`);
        process.exit(1);
    }
}