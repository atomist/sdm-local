import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole } from "../support/consoleOutput";

export function addGitHooksCommands(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "add-git-hooks",
        describe: `Install git hooks for projects under ${sdm.configuration.repositoryOwnerParentDirectory}`,
        handler: () => {
            return logExceptionsToConsole(() => sdm.installGitHooks());
        },
    }).command({
        command: "remove-git-hooks",
        describe: `Remove git hooks for projects under ${sdm.configuration.repositoryOwnerParentDirectory}`,
        handler: () => {
            return logExceptionsToConsole(() => sdm.removeGitHooks());
        },
    });
}
