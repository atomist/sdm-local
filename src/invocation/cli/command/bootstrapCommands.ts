import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { GeneratorRegistration, SoftwareDeliveryMachine } from "@atomist/sdm";
import { UpdatePackageJsonIdentification } from "@atomist/sdm-pack-node";
import { NodeProjectCreationParametersDefinition } from "@atomist/sdm-pack-node";
import { NodeProjectCreationParameters } from "@atomist/sdm-pack-node/dist/support/generator/NodeProjectCreationParameters";
import { Argv } from "yargs";
import { AutomationClientConnectionConfig } from "../../http/AutomationClientConnectionConfig";
import { addEmbeddedCommand } from "./support/embeddedCommandExecution";

/**
 * Generator that can create a new SDM
 */
const sdmGenerator: GeneratorRegistration<NodeProjectCreationParameters> = {
    name: "createSdm",
    startingPoint: new GitHubRepoRef("atomist", "sample-sdm"),
    parameters: NodeProjectCreationParametersDefinition,
    transform: [
        UpdatePackageJsonIdentification,
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
