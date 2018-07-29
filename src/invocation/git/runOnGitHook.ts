import { logger } from "@atomist/automation-client";
import { logExceptionsToConsole } from "../cli/support/consoleOutput";
import { suggestStartingAllMessagesListener } from "../cli/support/suggestStartingAllMessagesListener";
import { AutomationClientConnectionConfig } from "../http/AutomationClientConnectionConfig";
import { fetchMetadataFromAutomationClient } from "../http/metadataReader";
import { argsToGitHookInvocation, handleGitHookEvent } from "./handlePushBasedEventOnRepo";
import { isAtomistTemporaryBranch } from "../../binding/FileSystemProjectLoader";

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */
export async function runOnGitHook(argv: string[], connectionConfig: AutomationClientConnectionConfig) {
    const invocation = argsToGitHookInvocation(argv);
    if (isAtomistTemporaryBranch(invocation.branch)) {
        logger.info("Ignoring Atomist temporary branch in '%j': Atomist will eventually surface these changes to let hook react",
            invocation);
    }
    const automationClientInfo = await fetchMetadataFromAutomationClient(connectionConfig);
    await suggestStartingAllMessagesListener();
    logger.debug("Executing git hook against project %j", invocation);
    return logExceptionsToConsole(() =>
            handleGitHookEvent(connectionConfig, automationClientInfo.localConfig, invocation),
        automationClientInfo.connectionConfig.showErrorStacks,
    );
}
