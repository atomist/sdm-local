import { Argv } from "yargs";
import { determineCwd } from "../../../binding/expandedTreeUtils";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole } from "../support/consoleOutput";

// TODO add which trigger
export function addTriggerCommand(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "trigger",
        describe: "Install git hooks",
        handler: () => {
            return logExceptionsToConsole(() => trigger(sdm));
        },
    });
}

async function trigger(sdm: LocalSoftwareDeliveryMachine, event: "push" = "push") {
    const whereAreWe = determineCwd();
    throw new Error(whereAreWe);
}
