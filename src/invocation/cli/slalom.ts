#!/usr/bin/env node

import { suppressConsoleLogging } from "./support/configureLogging";

suppressConsoleLogging();

import { DefaultConfig } from "../AutomationClientInfo";
import { runSlalom } from "./runSlalom";

runSlalom(DefaultConfig);
