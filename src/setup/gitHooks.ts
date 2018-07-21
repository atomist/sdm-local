import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { OnPushToAnyBranch } from "@atomist/sdm-core/typings/types";
import { FileSystemRemoteRepoRef } from "../binding/FileSystemRemoteRepoRef";
import { pushFromLastCommit } from "../binding/localPush";
import { AutomationClientInfo } from "../invocation/AutomationClientInfo";
import { errorMessage } from "../invocation/cli/support/consoleOutput";
import { invokeEventHandler } from "../invocation/http/EventHandlerInvocation";

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
 * Invoking the target remote client for this push.
 * @param ai information about automation client we're connected to
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
        name: "SetGoalsOnPush",
        payload: { Push: [push] },
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
