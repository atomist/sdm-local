import { camelize } from "tslint/lib/utils";
import { errorMessage } from "../invocation/cli/support/consoleOutput";
import { LocalSoftwareDeliveryMachine } from "../machine/LocalSoftwareDeliveryMachine";

/**
 * Git hooks we support
 * @type {string[]}
 */
export const HookEvents = ["post-commit", "post-merge"];

export async function handleGitHookEvent(sdm: LocalSoftwareDeliveryMachine,
                                         event: string,
                                         payload: { baseDir: string, branch: string, sha: string }) {
    if (!HookEvents.includes(event)) {
        errorMessage("Unknown git hook event '%s'", event);
        process.exit(1);
    }
    const sdmMethod = sdm[camelize(event)];
    if (!sdmMethod) {
        errorMessage("Internal error: no SDM handler for git hook event '%s'", event);
        process.exit(1);
    }
    return sdm[camelize(event)](payload.baseDir, payload.branch, payload.sha);
}
