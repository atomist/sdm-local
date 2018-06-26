import { suppressConsoleLogging } from "../cli/support/configureLogging";

suppressConsoleLogging();

import { logExceptionsToConsole, setCommandLineLogging } from "../cli/support/consoleOutput";

setCommandLineLogging();

import { logger } from "@atomist/automation-client";
import { localSdmInstance } from "../machineLoader";

/**
 * Usage gitHookTrigger <event> <directory>
 */

/* tslint:disable */

export type GitHookEvent = "postCommit";

const args = process.argv.slice(2);

const event: GitHookEvent = args[0] as GitHookEvent;
const baseDir = args[1].replace("/.git/hooks", "");
const branch = args[2];
const sha = args[3];

logger.info("Executing git hook against project at [%s], branch=%s, sha=%s",
    baseDir, branch, sha);

const sdmMethod = localSdmInstance[event];
if (!sdmMethod) {
    logger.warn("Unknown git hook event '%s'", event);
}

logExceptionsToConsole(() =>
    localSdmInstance[event](baseDir, branch, sha)
);
