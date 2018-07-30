import { GeneratorRegistration, SoftwareDeliveryMachine } from "@atomist/sdm";
import { Argv } from "yargs";
import { AutomationClientConnectionConfig } from "../../http/AutomationClientConnectionConfig";
import { addEmbeddedCommand } from "./support/embeddedCommandExecution";
import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
//import { UpdatePackageJsonIdentification } from "@atomist/sdm-pack-node";

const sdmGenerator: GeneratorRegistration<{ name: string }> = {
    name: "createSdm",
    startingPoint: new GitHubRepoRef("atomist", "sample-sdm"),
    parameters: {
        //name: {},
    },
    transform: [
        //UpdatePackageJsonIdentification,
        async p => p,
    ],
};

export function addBootstrapCommands(connectionConfig: AutomationClientConnectionConfig, yargs: Argv) {
    addSdmGenerator(connectionConfig, yargs);
}

function addSdmGenerator(connectionConfig: AutomationClientConnectionConfig, yargs: Argv) {
    addEmbeddedCommand(connectionConfig, yargs, {
        cliCommand: "new sdm",
        cliDescription: "Create an SDM",
        registration: sdmGenerator,
        configure: configureBootstrapMachine,
    });
}

/**
 * Add bootstrap commands
 * @param {SoftwareDeliveryMachine} sdm
 */
function configureBootstrapMachine(sdm: SoftwareDeliveryMachine) {
    sdm.addGeneratorCommand(sdmGenerator);
}
