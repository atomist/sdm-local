import { suppressConsoleLogging } from "../cli/support/configureLogging";
import { logExceptionsToConsole, setCommandLineLogging } from "../cli/support/consoleOutput";

suppressConsoleLogging();
setCommandLineLogging();

import { logger } from "@atomist/automation-client";
import { handleGitHookEvent } from "../../setup/gitHooks";
import { localSdmInstance } from "../machineLoader";

/**
 * Usage gitHookTrigger <git hook name> <directory> <branch> <sha>
 */

const args = process.argv.slice(2);

const event: string = args[0];
const baseDir = args[1].replace("/.git/hooks", "");
const branch = args[2];
const sha = args[3];

logger.info("Executing git hook against project at [%s], branch=%s, sha=%s",
    baseDir, branch, sha);

/* tslint:disable */

logExceptionsToConsole(() =>
    handleGitHookEvent(localSdmInstance, event, { baseDir, branch, sha }),
);
