import { logger } from "@atomist/automation-client";
import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { determineCwd, withinExpandedTree } from "../../binding/expandedTreeUtils";
import { FileSystemRemoteRepoRef } from "../../binding/FileSystemRemoteRepoRef";
import { shaHistory } from "../../util/git";
import { AutomationClientInfo } from "../AutomationClientInfo";
import { errorMessage, infoMessage } from "../cli/support/consoleOutput";
import { handleGitHookEvent } from "./handleEventOnRepo";

/**
 * Trigger git events to the given depth in the current project repo
 * @param {AutomationClientInfo} ai
 * @param {string} event
 * @param {number} depth
 * @return {Promise<void>}
 */
export async function triggerGitEvents(ai: AutomationClientInfo, event: string, depth: number) {
    const currentDir = determineCwd();
    if (withinExpandedTree(ai.localConfig.repositoryOwnerParentDirectory, currentDir)) {
        const p = GitCommandGitProject.fromBaseDir(FileSystemRemoteRepoRef.fromDirectory({
                repositoryOwnerParentDirectory: ai.localConfig.repositoryOwnerParentDirectory,
                baseDir: currentDir,
            }),
            currentDir, null, () => null);
        logger.debug("Trigger %s within [%s], depth=%d", event, currentDir, depth);
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
            logger.debug("Trigger %j", invocation);
            await handleGitHookEvent(ai, invocation);
        }
    } else {
        errorMessage(
            `Working directory ${currentDir} is not within expanded working tree under ${ai.localConfig.repositoryOwnerParentDirectory}`);
        process.exit(1);
    }
}
