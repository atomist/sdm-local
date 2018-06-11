#!/usr/bin/env node

process.env.ATOMIST_DISABLE_LOGGING = "true";

import * as yargs from "yargs";
import { localSdmInstance } from "../machine";

import { addGitHooksCommand } from "./command/addGitHooksCommand";
import { addSummonDemon } from "./command/addSummonDemon";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addEditCommand } from "./command/editCommand";
import { addGenerateCommand } from "./command/generateCommand";
import { addImportFromGitHubCommand } from "./command/importFromGitHubCommand";
import { addRunCommand } from "./command/runCommand";

/* tslint:disable */

yargs.usage("Usage: $0 <command> [options]");

addTriggerCommand(localSdmInstance, yargs);
addSummonDemon(localSdmInstance, yargs);
addGitHooksCommand(localSdmInstance, yargs);
addGenerateCommand(localSdmInstance, yargs);
addEditCommand(localSdmInstance, yargs);
addRunCommand(localSdmInstance, yargs);
addImportFromGitHubCommand(localSdmInstance, yargs);

yargs
    .epilog("Copyright Atomist 2018")
    .demandCommand(1, `Please provide a command for local SDM ${localSdmInstance.name}`)
    .help()
    .argv;

