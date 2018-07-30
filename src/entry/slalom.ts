#!/usr/bin/env node

/*
    Main entry point script
*/

// Disable console logging
process.env.ATOMIST_DISABLE_LOGGING = "true";

import { runSlalom } from "../invocation/cli/runSlalom";
import { resolveConnectionConfig } from "./resolveConnectionConfig";

// Prevent loading of metadata for built-in commands
if (process.argv.length >= 3 && ["git", "config", "gql-fetch", "gql-gen", "start", "kube"].includes(process.argv[2])) {
    // tslint:disable-next-line:no-floating-promises
    runSlalom(resolveConnectionConfig(), false);
} else {
    // tslint:disable-next-line:no-floating-promises
    runSlalom(resolveConnectionConfig());
}


