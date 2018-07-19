import { camelize } from "tslint/lib/utils";
import { errorMessage } from "../invocation/cli/support/consoleOutput";
import { LocalSoftwareDeliveryMachine } from "../machine/LocalSoftwareDeliveryMachine";

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
 * Dispatch the incoming git hook event to a local SDM
 * @param {LocalSoftwareDeliveryMachine} sdm
 * @param {string} event
 * @param payload event data
 * @return {Promise<any>}
 */
export async function handleGitHookEvent(sdm: LocalSoftwareDeliveryMachine,
                                         payload: GitHookInvocation) {
    if (!HookEvents.includes(payload.event)) {
        errorMessage("Unknown git hook event '%s'", event);
        process.exit(1);
    }
    const sdmMethod = sdm[camelize(payload.event)];
    if (!sdmMethod) {
        errorMessage("Internal error: no SDM handler for git hook event '%s'", event);
        process.exit(1);
    }
    return sdm[camelize(payload.event)](payload.baseDir, payload.branch, payload.sha);
}
