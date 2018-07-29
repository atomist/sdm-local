import { Argv } from "yargs";
import { logExceptionsToConsole } from "../support/consoleOutput";
import { createBootstrapMachine } from "../../../embedded/bootstrap";
import { infoMessage } from "../../..";
import { AutomationClientConnectionConfig } from "../../http/AutomationClientConnectionConfig";

export function addBootstrapCommand(connectionConfig: AutomationClientConnectionConfig, yargs: Argv) {
    yargs.command({
        command: "bootstrap <repositoryOwnerParentDirectory>",
        describe: "Bootstrap",
        builder: ra => {
            return ra.positional("repositoryOwnerParentDirectory", {
            });
        },
        handler: argv => {
            return logExceptionsToConsole( async () => {
                infoMessage("repositoryOwnerParentDirectory=%s", argv.repositoryOwnerParentDirectory);
                return createBootstrapMachine(argv.repositoryOwnerParentDirectory);
            }, connectionConfig.showErrorStacks);
        },
    });
}
