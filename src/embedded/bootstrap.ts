import { Configuration } from "@atomist/automation-client";
import { automationClient } from "@atomist/automation-client/automationClient";
import { defaultConfiguration, invokePostProcessors } from "@atomist/automation-client/configuration";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { configureSdm, createSoftwareDeliveryMachine } from "@atomist/sdm-core";
import { ConfigureMachine } from "@atomist/sdm/api/machine/MachineConfigurer";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm/api/machine/SoftwareDeliveryMachineOptions";
import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";
import { LocalLifecycle } from "../machine/localLifecycle";
import { configureLocal } from "../machine/localPostProcessor";

const BootstrapPort = 2867;

const CreateMachine = (configure: ConfigureMachine) => (config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine => {
    const sdm: SoftwareDeliveryMachine = createSoftwareDeliveryMachine(
        {
            name: "Slalom bootstrap machine",
            configuration: config,
        });
    sdm.addExtensionPacks(LocalLifecycle);
    configure(sdm);
    return sdm;
};

function configurationFor(repositoryOwnerParentDirectory: string,
                          configure: ConfigureMachine): Configuration {
    const cfg = defaultConfiguration();
    cfg.name = "@atomist/slalom-bootstrap";
    cfg.http.port = BootstrapPort;

    cfg.logging.level = "info";
    cfg.logging.file.enabled = false;

    cfg.ws.enabled = false;
    cfg.applicationEvents.enabled = false;

    cfg.commands = [];
    cfg.events = [];
    cfg.ingesters = [];
    cfg.listeners = [];

    cfg.postProcessors = [
        configureLocal({
            repositoryOwnerParentDirectory,
            mergeAutofixes: true,
            preferLocalSeeds: false,
            forceLocal: true,
        }),
        configureSdm(CreateMachine(configure), {}),
    ];

    return cfg;
}

/**
 * Create an embedded SDM to perform bootstrap commands such as
 * generating a new SDM
 * @param {string} repositoryOwnerParentDirectory
 * @return {Promise<AutomationClientConnectionConfig>}
 */
export async function createBootstrapMachine(repositoryOwnerParentDirectory: string,
                                             configure: ConfigureMachine,
): Promise<AutomationClientConnectionConfig> {
    const config = await invokePostProcessors(
        configurationFor(repositoryOwnerParentDirectory, configure));
    const client = automationClient(config);
    return client.run()
        .then(() => ({
            atomistTeamId: "T123",
            atomistTeamName: "slalom",
            baseEndpoint: `http://localhost:${BootstrapPort}`,
        }));
}
