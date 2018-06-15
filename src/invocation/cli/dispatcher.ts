#!/usr/bin/env node

// process.env.ATOMIST_DISABLE_LOGGING = "true";

import { logger } from "@atomist/automation-client";
import { execSync } from "child_process";
import { determineSdmRoot } from "../../binding/expandedTreeUtils";

const sdmRoot = determineSdmRoot();

const command = `/${sdmRoot}/node_modules/@atomist/slalom/build/src/invocation/cli/slalom.js ${
    process.argv.slice(2).join(" ")}`;

logger.info("Slalom invoked in %s", sdmRoot);
logger.info(`Command is [${command}]`);

execSync(command,
    {
        // cwd: sdmRoot,
        stdio: [0, 1, 2],
    });
