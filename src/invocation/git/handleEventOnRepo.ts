import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { OnPushToAnyBranch } from "@atomist/sdm";
import { FileSystemRemoteRepoRef } from "../../binding/FileSystemRemoteRepoRef";
import { pushFromLastCommit } from "../../binding/pushFromLastCommit";
import { errorMessage } from "../cli/support/consoleOutput";
import { invokeEventHandler } from "../http/EventHandlerInvocation";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { LocalMachineConfig } from "../..";
import Push = OnPushToAnyBranch.Push;

/**
 * Any event on a local repo
 */
export interface EventOnRepo {

    baseDir: string;
    branch: string;
    sha: string;
}

export interface GitHookInvocation extends EventOnRepo {
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
    const baseDir = args[1].replace(/.git[\/hooks]?$/, "")
        .replace(/\/$/, "");
    const branch = args[2];
    const sha = args[3];
    return { event, baseDir, branch, sha };
}

/**
 * Invoking the target remote client for this push.
 * @param payload event data
 * @return {Promise<any>}
 */
export async function handleGitHookEvent(cc: AutomationClientConnectionConfig,
                                         lc: LocalMachineConfig,
                                         payload: GitHookInvocation) {
    if (!payload) {
        errorMessage("Payload must be supplied");
        process.exit(1);
    }
    if (!payload.event) {
        errorMessage("Invalid git hook invocation payload. Event is required: %j", payload);
        process.exit(1);
    }
    if (!HookEvents.includes(payload.event)) {
        errorMessage("Unknown git hook event '%s'", event);
        process.exit(1);
    }

    return handleEventOnRepo(cc, lc, payload, "SetGoalsOnPush");
}

/**
 * Perform push-based event handling on this repo
 * @param {EventOnRepo} payload
 * @param {string} eventHandlerName
 * @return {Promise<HandlerResult>}
 */
export async function handleEventOnRepo(cc: AutomationClientConnectionConfig,
                                        lc: LocalMachineConfig,
                                        payload: EventOnRepo,
                                        eventHandlerName: string,
                                        pushToPayload: (p: Push) => object = p => ({
                                            Push: [p],
                                        })) {

    // This git hook may be invoked from another git hook. This will cause these values to
    // be incorrect, so we need to delete them to have git work them out again from the directory we're passing via cwd
    // https://stackoverflow.com/questions/3542854/calling-git-pull-from-a-git-post-update-hook
    delete process.env.GIT_DIR;
    delete process.env.GIT_WORK_TREE;

    if (!payload) {
        errorMessage("Payload must be supplied");
        process.exit(1);
    }
    if (!payload.branch || !payload.sha || !payload.baseDir) {
        errorMessage("Invalid git hook invocation payload: %j", payload);
        process.exit(1);
    }

    const push = await createPush(cc.atomistTeamId, lc.repositoryOwnerParentDirectory, payload);
    return invokeEventHandler(cc, {
        name: eventHandlerName,
        payload: pushToPayload(push),
    });
}

async function createPush(teamId: string, repositoryOwnerParentDirectory: string, payload: EventOnRepo): Promise<OnPushToAnyBranch.Push> {
    const { baseDir, branch, sha } = payload;
    return doWithProjectUnderExpandedDirectoryTree(baseDir, branch, sha, repositoryOwnerParentDirectory,
        async p => {
            return pushFromLastCommit(teamId, p);
        });
}

async function doWithProjectUnderExpandedDirectoryTree(baseDir: string,
                                                       branch: string,
                                                       sha: string,
                                                       repositoryOwnerParentDirectory: string,
                                                       action: (p: GitProject) => Promise<any>) {
    const p = GitCommandGitProject.fromBaseDir(
        FileSystemRemoteRepoRef.fromDirectory({
            repositoryOwnerParentDirectory,
            baseDir, branch, sha,
        }),
        baseDir,
        {},
        () => null);
    return action(p);
}
