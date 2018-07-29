import { Argv } from "yargs";
import { infoMessage } from "../../..";
import { createBootstrapMachine } from "../../../embedded/bootstrap";
import { AutomationClientConnectionConfig } from "../../http/AutomationClientConnectionConfig";
import { fetchMetadataFromAutomationClient } from "../../http/metadataReader";
import { errorMessage, logExceptionsToConsole } from "../support/consoleOutput";
import { runCommand } from "./support/runCommand";

export function addBootstrapCommand(connectionConfig: AutomationClientConnectionConfig, yargs: Argv) {
    yargs.command({
        command: "bootstrap <repositoryOwnerParentDirectory>",
        describe: "Bootstrap",
        builder: ra => {
            return ra.positional("repositoryOwnerParentDirectory", {});
        },
        handler: argv => {
            return logExceptionsToConsole(async () => {
                // infoMessage("repositoryOwnerParentDirectory=%s", argv.repositoryOwnerParentDirectory);
                return runCommandOnBootstrapMachine(
                    argv.repositoryOwnerParentDirectory,
                    "hello",
                    { name: "Rod " });
            }, connectionConfig.showErrorStacks);
        },
    });
}

async function runCommandOnBootstrapMachine(repositoryOwnerParentDirectory: string,
                                            name: string,
                                            params: object) {
    const cc = await createBootstrapMachine(repositoryOwnerParentDirectory);
    const ai = await fetchMetadataFromAutomationClient(cc);
    infoMessage("Found %d commands: %s", ai.commandsMetadata.length, ai.commandsMetadata.map(a => a.name));
    const hm = ai.commandsMetadata.find(c => c.name === name);
    if (!hm) {
        errorMessage("No command named '%s'\n", name);
        process.exit(1);
    }
    return runCommand(cc,
        repositoryOwnerParentDirectory,
        hm,
        params);
}
