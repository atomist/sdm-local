import { logger } from "@atomist/automation-client";
import { argsToGitHookInvocation, handleGitHookEvent } from "../../setup/gitHooks";
import { logExceptionsToConsole } from "../cli/support/consoleOutput";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { getMetadata } from "../http/metadataReader";

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export async function runOnGitHook(argv: string[], connectionConfig: AutomationClientConnectionConfig) {
    const automationClientInfo = await getMetadata(connectionConfig);

    const invocation = argsToGitHookInvocation(argv);
    logger.info("Executing git hook against project %j", invocation);

    return logExceptionsToConsole(() =>
            handleGitHookEvent(automationClientInfo, invocation),
        automationClientInfo.connectionConfig.showErrorStacks,
    );
}
