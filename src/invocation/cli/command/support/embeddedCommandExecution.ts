import { ConfigureMachine } from "@atomist/sdm";
import { CommandRegistration } from "@atomist/sdm/api/registration/CommandRegistration";
import { Argv } from "yargs";
import { createBootstrapMachine } from "../../../../embedded/bootstrap";
import { AutomationClientConnectionConfig } from "../../../http/AutomationClientConnectionConfig";
import { fetchMetadataFromAutomationClient } from "../../../http/metadataReader";
import { errorMessage, logExceptionsToConsole } from "../../support/consoleOutput";
import { runCommand } from "./runCommand";
import { toParametersListing } from "@atomist/sdm/api-helper/machine/handlerRegistrations";

/**
 * Spec for running an embedded command on an ephemeral SDM
 */
export interface EmbeddedCommandSpec {

    cliCommand: string;

    cliDescription: string;

    registration: CommandRegistration<any>;

    /**
     * Configure the machine to run the command
     */
    configure: ConfigureMachine;
}

/**
 * Add a command, asking for repositoryOwnerParentDirectory and spawn a machine
 * to execute it.
 * Once the client connects, it will prompt for parameters required by the command.
 * @param {AutomationClientConnectionConfig} connectionConfig
 * @param {yargs.Argv} yargs
 */
export function addBootstrapCommand(connectionConfig: AutomationClientConnectionConfig,
                                    yargs: Argv,
                                    spec: EmbeddedCommandSpec) {
    yargs.command({
        command: spec.cliCommand,
        describe: spec.cliDescription,
        builder: ra => {
            let r = ra.option("repositoryOwnerParentDirectory", {
                required: true,
                description: "Base of the checked out directory tree the new SDM will operate on",
            });
            if (!!spec.registration.parameters) {
                const pl = toParametersListing(spec.registration.parameters);
                for (const param of pl.parameters) {
                    r = r.option(param.name, {
                        description: param.description,
                        required: false,
                    });
                }
            }
            return r;
        },
        handler: argv => {
            return logExceptionsToConsole(async () => {
                // infoMessage("repositoryOwnerParentDirectory=%s", argv.repositoryOwnerParentDirectory);
                return runCommandOnBootstrapMachine(
                    argv.repositoryOwnerParentDirectory,
                    spec.configure,
                    spec.registration.name,
                    argv);
            }, connectionConfig.showErrorStacks);
        },
    });
}

async function runCommandOnBootstrapMachine(repositoryOwnerParentDirectory: string,
                                            configure: ConfigureMachine,
                                            name: string,
                                            params: object) {
    const cc = await createBootstrapMachine(repositoryOwnerParentDirectory,
        configure);
    const ai = await fetchMetadataFromAutomationClient(cc);
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
