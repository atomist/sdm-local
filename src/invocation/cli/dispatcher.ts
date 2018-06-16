#!/usr/bin/env node

process.env.ATOMIST_DISABLE_LOGGING = "true";

import { writeToConsole } from "./support/consoleOutput";

import { logger } from "@atomist/automation-client";
import { execSync } from "child_process";
import { determineCwd, determineSdmRoot } from "../../binding/expandedTreeUtils";

const sdmRoot = determineSdmRoot();

if (!sdmRoot) {
    writeToConsole({ message: `Cannot determine SDM root in ${determineCwd()}`, color: "red" });
    if (determineCwd().endsWith("sdm")) {
        writeToConsole("You might need to `npm link @atomist/slalom`");
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
