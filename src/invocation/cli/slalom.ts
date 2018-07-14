#!/usr/bin/env node

import { suppressConsoleLogging } from "./support/configureLogging";

suppressConsoleLogging();

import { localSdmInstance } from "../machineLoader";
import { runSlalom } from "./runSlalom";

runSlalom(localSdmInstance);
