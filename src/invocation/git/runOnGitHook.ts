import { suppressConsoleLogging } from "../cli/support/configureLogging";
import { logExceptionsToConsole, setCommandLineLogging } from "../cli/support/consoleOutput";
import { logger } from "@atomist/automation-client";
import { LocalSoftwareDeliveryMachine } from "../../machine/LocalSoftwareDeliveryMachine";
import { argsToGitHookInvocation, handleGitHookEvent } from "../../setup/gitHooks";

suppressConsoleLogging();
setCommandLineLogging();

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export function runOnGitHook(argv: string[], sdm: LocalSoftwareDeliveryMachine) {
    const invocation = argsToGitHookInvocation(argv);
    logger.info("Executing git hook against project %j", invocation);

    return logExceptionsToConsole(() =>
            handleGitHookEvent(sdm, invocation),
        sdm.configuration.showErrorStacks,
    );
}
