
import { logger } from "@atomist/automation-client";
import { WellKnownGoals } from "@atomist/sdm-core";
import { determineCwd, determineSdmRoot } from "../binding/expandedTreeUtils";
import { LocalMachineConfig } from "../machine/LocalMachineConfig";
import { LocalSoftwareDeliveryMachine } from "../machine/LocalSoftwareDeliveryMachine";
import { mergeConfiguration } from "../machine/mergeConfiguration";

import chalk from "chalk";

const sdmRoot = determineSdmRoot();

if (!sdmRoot) {
    process.stdout.write(chalk.red(`Cannot determine SDM root in ${determineCwd()}`));
    process.exit(1);
}

const modulePath = `${sdmRoot}/build/src/local.js`;

logger.info("Loading config from " + modulePath);

// TODO different machine name options - as command line argument (how that early)
// or in env variable?

// tslint:disable-next-line:no-var-requires
const config: LocalMachineConfig = require(modulePath).Config;

// TODO could use multiple if necessary - with a command line argument

export const localSdmInstance = new LocalSoftwareDeliveryMachine(
    config.name,
    mergeConfiguration(
        sdmRoot,
        config));
localSdmInstance.addExtensionPacks(WellKnownGoals);

config.init(localSdmInstance);
