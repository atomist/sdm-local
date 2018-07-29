#!/usr/bin/env node

/*
    Main entry point script
*/

// process.env.ATOMIST_DISABLE_LOGGING = "true";

import { runSlalom } from "../invocation/cli/runSlalom";
import { resolveConnectionConfig } from "./resolveConnectionConfig";

// tslint:disable-next-line:no-floating-promises
runSlalom(resolveConnectionConfig());
