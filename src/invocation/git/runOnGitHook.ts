import { suppressConsoleLogging } from "../cli/support/configureLogging";
import { logExceptionsToConsole, setCommandLineLogging } from "../cli/support/consoleOutput";

suppressConsoleLogging();
setCommandLineLogging();

import { logger } from "@atomist/automation-client";
import { LocalSoftwareDeliveryMachine } from "../../machine/LocalSoftwareDeliveryMachine";
import { handleGitHookEvent } from "../../setup/gitHooks";

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export function runOnGitHook(argv: string[], sdm: LocalSoftwareDeliveryMachine) {
    const args = argv.slice(2);

    const event: string = args[0];
    // We can be invoked in the .git/hooks directory or from the git binary itself
    const baseDir = args[1].replace(/.git[\/hooks]?$/, "");
    const branch = args[2];
    const sha = args[3];

    logger.info("Executing git hook against project at [%s], branch=%s, sha=%s",
        baseDir, branch, sha);

    /* tslint:disable */

    return logExceptionsToConsole(() =>
            handleGitHookEvent(sdm, { event, baseDir, branch, sha }),
        sdm.configuration.showErrorStacks,
    );
}
