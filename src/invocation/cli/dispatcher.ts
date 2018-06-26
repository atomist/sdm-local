#!/usr/bin/env node

import { suppressConsoleLogging } from "./support/configureLogging";

suppressConsoleLogging();

import { logger } from "@atomist/automation-client";
import { execSync } from "child_process";
import { determineCwd, determineSdmRoot } from "../../binding/expandedTreeUtils";
import { errorMessage } from "./support/consoleOutput";

const sdmRoot = determineSdmRoot();

if (!sdmRoot) {
    errorMessage(`Cannot determine SDM root in ${determineCwd()}`);
    if (determineCwd().endsWith("sdm")) {
        errorMessage("You might need to `npm link @atomist/slalom`");
    }
    process.exit(1);
}

const command = `/${sdmRoot}/node_modules/@atomist/slalom/build/src/invocation/cli/slalom.js ${
    process.argv.slice(2).join(" ")}`;

logger.info("Slalom invoked in %s", sdmRoot);
logger.info(`Command is [${command}]`);

try {
    execSync(command,
        {
            // cwd: sdmRoot,
            stdio: [0, 1, 2],
        });
} catch (err) {
    // Called process will have output its error message
    process.exit(1);
}
