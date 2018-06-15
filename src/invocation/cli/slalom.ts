#!/usr/bin/env node

// TODO pull out into config

import { addShowSkills } from "./command/showSkills";

process.env.ATOMIST_DISABLE_LOGGING = "true";

process.env.SUPPRESS_NO_CONFIG_WARNING = "true";

import * as yargs from "yargs";
import { localSdmInstance } from "../machine";

import { addGitHooksCommands } from "./command/addGitHooksCommands";
import { addRunCommand } from "./command/addRunCommand";
import { addSummonDemon } from "./command/addSummonDemon";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addEditCommand } from "./command/editCommand";
import { addGenerateCommand } from "./command/generateCommand";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";

/* tslint:disable */

yargs.usage("Usage: slalom <command> [options]");

addTriggerCommand(localSdmInstance, yargs);
addSummonDemon(localSdmInstance, yargs);
addGitHooksCommands(localSdmInstance, yargs);
addGenerateCommand(localSdmInstance, yargs);
addEditCommand(localSdmInstance, yargs);
addRunCommand(localSdmInstance, yargs);
addImportFromGitRemoteCommand(localSdmInstance, yargs);
addShowSkills(localSdmInstance, yargs);

yargs
    .epilog("Copyright Atomist 2018")
    .demandCommand(1, `Please provide a command for local SDM ${localSdmInstance.name} handling projects under ${
        localSdmInstance.configuration.repositoryOwnerParentDirectory}`)
    .help()
    .wrap(100)
    .argv;

