import { CommandHandlerRegistration, SoftwareDeliveryMachine } from "@atomist/sdm";
import { Argv } from "yargs";
import { AutomationClientConnectionConfig } from "../../http/AutomationClientConnectionConfig";
import { addBootstrapCommand } from "./support/embeddedCommandExecution";

const sdmGenerator: CommandHandlerRegistration<{ name: string }> = {
    name: "hello",
    parameters: {
        name: {},
    },
    listener: async ci => {
        return ci.addressChannels(`Hello ${ci.parameters.name}`);
    },
};

export function addBootstrapCommands(connectionConfig: AutomationClientConnectionConfig, yargs: Argv) {
    addSdmGenerator(connectionConfig, yargs);
}

function addSdmGenerator(connectionConfig: AutomationClientConnectionConfig, yargs: Argv) {
    addBootstrapCommand(connectionConfig, yargs, {
        cliCommand: "xcreate SDM",
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
    sdm.addCommand(sdmGenerator);
}
