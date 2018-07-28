import { logger } from "@atomist/automation-client";
import { logExceptionsToConsole } from "../cli/support/consoleOutput";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { fetchMetadataFromAutomationClient } from "../http/metadataReader";
import { argsToGitHookInvocation, handleGitHookEvent } from "./handleEventOnRepo";

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export async function runOnGitHook(argv: string[], connectionConfig: AutomationClientConnectionConfig) {
    const automationClientInfo = await fetchMetadataFromAutomationClient(connectionConfig);
    const invocation = argsToGitHookInvocation(argv);
    logger.debug("Executing git hook against project %j", invocation);
    return logExceptionsToConsole(() =>
            handleGitHookEvent(connectionConfig, automationClientInfo.localConfig, invocation),
        automationClientInfo.connectionConfig.showErrorStacks,
    );
}
