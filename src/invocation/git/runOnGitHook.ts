import { suppressConsoleLogging } from "../cli/support/configureLogging";
import { logExceptionsToConsole, setCommandLineLogging } from "../cli/support/consoleOutput";
import { logger } from "@atomist/automation-client";
import { LocalSoftwareDeliveryMachine } from "../../machine/LocalSoftwareDeliveryMachine";
import { argsToGitHookInvocation, handleGitHookEvent } from "../../setup/gitHooks";
import { LocalSoftwareDeliveryMachineConfiguration } from "../../machine/LocalSoftwareDeliveryMachineConfiguration";
import { LocalMachineConfig, newLocalSdm } from "../..";

suppressConsoleLogging();
setCommandLineLogging();

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export function runOnGitHook(argv: string[], config: LocalMachineConfig) {
    const invocation = argsToGitHookInvocation(argv);
    logger.info("Executing git hook against project %j", invocation);

    const sdm = newLocalSdm(config);

    return logExceptionsToConsole(() =>
            handleGitHookEvent(sdm, invocation),
        sdm.configuration.showErrorStacks,
    );
}
