#!/usr/bin/env node

/*
    Main entry point script
 */

import { runSlalom } from "../invocation/cli/runSlalom";
import { resolveConnectionConfig } from "./resolveConnectionConfig";

runSlalom(resolveConnectionConfig());
