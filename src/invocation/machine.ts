import { writeToConsole } from "./cli/support/consoleOutput";

import { logger } from "@atomist/automation-client";
import { WellKnownGoals } from "@atomist/sdm/pack/well-known-goals/addWellKnownGoals";
import { determineCwd, determineSdmRoot } from "../binding/expandedTreeUtils";
import { loadConfiguration } from "../machine/loadConfiguration";
import { LocalSoftwareDeliveryMachine } from "../machine/LocalSoftwareDeliveryMachine";
import { CliMappedParameterResolver } from "./cli/support/CliMappedParameterResolver";

function failWith(message: string): string {
    throw new Error(message);
}

const sdmRoot = determineSdmRoot();

if (!sdmRoot) {
    writeToConsole({ message: `Cannot determine SDM root in ${determineCwd()}`, color: "red" });
    process.exit(1);
}

export const RepositoryOwnerParentDirectory = process.env.SDM_PROJECTS_ROOT ||
    failWith("Please define SDM_PROJECTS_ROOT to a directory containing git repositories, in the form of owner/repository");

export const localSdmInstance = new LocalSoftwareDeliveryMachine(
    determineSdmRoot(),
    "gitMachine",
    loadConfiguration(
        sdmRoot,
        RepositoryOwnerParentDirectory,
        {
            mergeAutofixes: true,
            mappedParameterResolver: new CliMappedParameterResolver(RepositoryOwnerParentDirectory),
        }));
localSdmInstance.addExtensionPacks(WellKnownGoals);

const modulePath = `${sdmRoot}/build/src/local.js`;

logger.info("Loading config from " + modulePath);

// tslint:disable-next-line:no-var-requires
const configureFun = require(modulePath).configureLocalMachine;

configureFun(localSdmInstance);
