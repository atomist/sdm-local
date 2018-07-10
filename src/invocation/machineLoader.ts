import { logger } from "@atomist/automation-client";
import { determineCwd, determineSdmRoot } from "../binding/expandedTreeUtils";
import { LocalMachineConfig } from "../machine/LocalMachineConfig";

import chalk from "chalk";
import { newLocalSdm } from "../machine/newLocalSdm";

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

export const localSdmInstance = newLocalSdm(config);
