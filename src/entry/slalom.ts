#!/usr/bin/env node

/*
    Main entry point script
*/

// Disable console logging
if (!isReservedCommand()) {
    process.env.ATOMIST_DISABLE_LOGGING = "true";
}

import { runSlalom } from "../invocation/cli/runSlalom";
import { resolveConnectionConfig } from "./resolveConnectionConfig";

// Prevent loading of metadata for built-in commands
if (isReservedCommand()) {
    // tslint:disable-next-line:no-floating-promises
    runSlalom();
} else {
    // tslint:disable-next-line:no-floating-promises
    runSlalom(resolveConnectionConfig());
}


function isReservedCommand() {
    return process.argv.length >= 3 && ["git", "config", "gql-fetch", "gql-gen", "start", "kube"].includes(process.argv[2]);
}

