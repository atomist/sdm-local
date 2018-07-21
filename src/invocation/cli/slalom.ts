#!/usr/bin/env node

/*
    Main entry point script
 */

import { DefaultConfig } from "../AutomationClientInfo";
import { runSlalom } from "./runSlalom";

runSlalom(DefaultConfig);
