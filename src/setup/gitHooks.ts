import { camelize } from "tslint/lib/utils";
import { errorMessage } from "../invocation/cli/support/consoleOutput";
import { LocalSoftwareDeliveryMachine } from "../machine/LocalSoftwareDeliveryMachine";
import { LocalMachineConfig, newLocalSdm } from "../index";

import axios from "axios";
import { isLocalMachineConfig } from "../machine/LocalMachineConfig";

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
    payload: GitHookInvocation,
    sdm: LocalSoftwareDeliveryMachine | LocalMachineConfig) {
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

    if (!isLocalMachineConfig(sdm)) {
        console.log("Invoking local shortcut")
        return invokeLocal(payload, sdm);
    }

    const url = "http://127.0.0.1:6660/githook";
    try {
        console.log("tryirng remote")
        await invokeRemote(payload, url);
    } catch (err) {
        console.log("Cannot POST to log service at [%s]: %s", url, err.message);
        return invokeLocal(payload, newLocalSdm(sdm));
    }
}

async function invokeLocal(invocation: GitHookInvocation, sdm: LocalSoftwareDeliveryMachine) {
    // Find the appropriate method to invoke
    const sdmMethod = sdm[camelize(invocation.event)];
    if (!sdmMethod) {
        errorMessage("Internal error: no SDM handler for git hook event '%s'", event);
        process.exit(1);
    }
    return sdm[camelize(invocation.event)](invocation);
}

async function invokeRemote(invocation: GitHookInvocation,
                            url: string) {
    console.log(`Write to url ${url}: ${JSON.stringify(invocation)}`);
    return axios.post(url, invocation);
}
