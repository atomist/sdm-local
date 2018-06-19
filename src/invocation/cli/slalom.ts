#!/usr/bin/env node

// TODO pull out into config

process.env.ATOMIST_DISABLE_LOGGING = "true";

process.env.SUPPRESS_NO_CONFIG_WARNING = "true";

import { addCommandsByName, addIntents } from "./command/addIntents";

import { addShowSkills } from "./command/showSkills";

import * as yargs from "yargs";
import { localSdmInstance } from "../machineLoader";

import { addGitHooksCommands } from "./command/addGitHooksCommands";
import { addSummonDemon } from "./command/addSummonDemon";
import { addTriggerCommand } from "./command/addTriggerCommand";
import { addImportFromGitRemoteCommand } from "./command/importFromGitRemoteCommand";

/* tslint:disable */

yargs.usage("Usage: slalom <command> [options]");

addTriggerCommand(localSdmInstance, yargs);
addSummonDemon(localSdmInstance, yargs);
addGitHooksCommands(localSdmInstance, yargs);
addCommandsByName(localSdmInstance, yargs);
addIntents(localSdmInstance, yargs);
addImportFromGitRemoteCommand(localSdmInstance, yargs);
addShowSkills(localSdmInstance, yargs);

yargs
    .epilog("Copyright Atomist 2018")
    .demandCommand(1, `Please provide a command for local SDM ${localSdmInstance.name} handling projects under ${
        localSdmInstance.configuration.repositoryOwnerParentDirectory}`)
    .help()
    .wrap(100)
    .strict()
    .completion()
    .version()
    .argv;
