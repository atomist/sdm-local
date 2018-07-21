import { errorMessage } from "../invocation/cli/support/consoleOutput";
import { invokeEventHandler } from "../invocation/http/EventHandlerInvocation";
import { AutomationClientInfo } from "../invocation/config";
import { OnPushToAnyBranch } from "@atomist/sdm-core/typings/types";
import { EventIncoming } from "@atomist/automation-client/internal/transport/RequestProcessor";
import { pushFromLastCommit } from "../binding/localPush";
import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";
import { LocalHandlerContext } from "../binding/LocalHandlerContext";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { FileSystemRemoteRepoRef } from "../binding/FileSystemRemoteRepoRef";
import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";

export interface GitHookPayload {
    baseDir: string;
    branch: string;
    sha: string;
}

export interface GitHookInvocation extends GitHookPayload {
    event: string;
}

/**
 * Git hooks we support
 * @type {string[]}
 */
export const HookEvents = [
    "post-commit",
    "post-merge",
    "pre-receive",
];

/**
 * Process the given args (probably from process.argv) into a
 * GitHookInvocation
 * @param {string[]} argv
 * @return {GitHookInvocation}
 */
export function argsToGitHookInvocation(argv: string[]): GitHookInvocation {
    const args = argv.slice(2);

    const event: string = args[0];
    // We can be invoked in the .git/hooks directory or from the git binary itself
    const baseDir = args[1].replace(/.git[\/hooks]?$/, "");
    const branch = args[2];
    const sha = args[3];
    return { event, baseDir, branch, sha };
}

/**
 * Dispatch the incoming git hook event to a local SDM,
 * routing to the appropriate method
 * @param {LocalSoftwareDeliveryMachine} sdm
 * @param payload event data
 * @return {Promise<any>}
 */
export async function handleGitHookEvent(
    ai: AutomationClientInfo,
    payload: GitHookInvocation) {
    if (!payload) {
        errorMessage("Payload must be supplied");
        process.exit(1);
    }
    if (!payload.event || !payload.branch || !payload.sha || !payload.baseDir) {
        errorMessage("Invalid git hook invocation payload: " + JSON.stringify(payload));
        process.exit(1);
    }
    if (!HookEvents.includes(payload.event)) {
        errorMessage("Unknown git hook event '%s'", event);
        process.exit(1);
    }

    const push = await createPush(ai, payload);
    return invokeEventHandler(ai.connectionConfig, {
        name: "OnPushToAnyBranch",
        payload: push,
    });
}

async function createPush(ai: AutomationClientInfo, payload: GitHookInvocation): Promise<OnPushToAnyBranch.Push> {
    const { baseDir, branch, sha } = payload;
    return doWithProjectUnderExpandedDirectoryTree(baseDir, branch, sha, ai,
        async p => {
            return pushFromLastCommit(p);
        });
}

async function doWithProjectUnderExpandedDirectoryTree(baseDir: string,
                                                       branch: string,
                                                       sha: string,
                                                       ai: AutomationClientInfo,
                                                       action: (p: GitProject) => Promise<any>) {
    const p = GitCommandGitProject.fromBaseDir(
        FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory: ai.localConfig.repositoryOwnerParentDirectory,
            baseDir, branch, sha,
        }),
        baseDir,
        {},
        () => null);
    return action(p);
}