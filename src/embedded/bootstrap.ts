import { Configuration } from "@atomist/automation-client";
import { automationClient } from "@atomist/automation-client/automationClient";
import { defaultConfiguration } from "@atomist/automation-client/configuration";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import { configureSdm, createSoftwareDeliveryMachine, } from "@atomist/sdm-core";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm/api/machine/SoftwareDeliveryMachineOptions";
import { LocalLifecycle } from "../machine/localLifecycle";
import { configureLocal } from "../machine/localPostProcessor";
import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";
import { infoMessage } from "..";
import { promisify } from "util";

const BootstrapPort = 2867;

function createMachine(config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine {
    const sdm: SoftwareDeliveryMachine = createSoftwareDeliveryMachine(
        {
            name: "Bootstrap Slalom machine",
            configuration: config,
        });
    sdm.addExtensionPacks(LocalLifecycle);

    infoMessage("Adding hello command");
    sdm.addCommand<{name: string}>({
        name: "hello",
        listener: async ci => {
            return ci.addressChannels(`Hello ${ci.parameters.name}`);
        },
    });
    return sdm;
}

function configurationFor(repositoryOwnerParentDirectory: string): Configuration {
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
        }),
        configureSdm(createMachine, {}),
    ];

    return cfg;
}

export async function createBootstrapMachine(repositoryOwnerParentDirectory: string): Promise<AutomationClientConnectionConfig> {
    const client = automationClient(configurationFor(repositoryOwnerParentDirectory));
    client.run();
    // TODO this is horrible
    await sleepPlease(5000);
    return {
        atomistTeamId: "T123",
        atomistTeamName: "slalom",
        baseEndpoint: `http://localhost:${BootstrapPort}`,
    };
}

const sleepPlease: (timeout: number) => Promise<void> =
    promisify((a, b) => setTimeout(b, a));