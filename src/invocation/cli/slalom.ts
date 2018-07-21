#!/usr/bin/env node

import { suppressConsoleLogging } from "./support/configureLogging";

suppressConsoleLogging();

import { runSlalom } from "./runSlalom";
import { DefaultConfig } from "../config";

runSlalom(DefaultConfig);
