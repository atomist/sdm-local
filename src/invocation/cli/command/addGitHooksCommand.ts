import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole } from "../support/consoleOutput";

export function addGitHooksCommand(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "add-git-hooks",
        describe: "Install git hooks",
        handler: () => {
            return logExceptionsToConsole(() => sdm.installGitHooks());
        },
    });
}
