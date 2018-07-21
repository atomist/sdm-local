import { logger } from "@atomist/automation-client";
import { argsToGitHookInvocation, handleGitHookEvent } from "../../setup/gitHooks";
import { infoMessage, logExceptionsToConsole } from "../cli/support/consoleOutput";
import { getMetadata } from "../http/metadataReader";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export async function runOnGitHook(argv: string[], connectionConfig: AutomationClientConnectionConfig) {
    infoMessage(`Connecting to Automation client at %s\n`, connectionConfig.baseEndpoint);
    const automationClientInfo = await getMetadata(connectionConfig);

    const invocation = argsToGitHookInvocation(argv);
    logger.info("Executing git hook against project %j", invocation);

    return logExceptionsToConsole(() =>
            handleGitHookEvent(automationClientInfo, invocation),
        automationClientInfo.connectionConfig.showErrorStacks,
    );
}
