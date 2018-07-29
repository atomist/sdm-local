import { Configuration } from "@atomist/automation-client";
import { automationClient } from "@atomist/automation-client/automationClient";
import { defaultConfiguration } from "@atomist/automation-client/configuration";
import { SoftwareDeliveryMachine } from "@atomist/sdm";
import {
    configureSdm,
    createSoftwareDeliveryMachine,
} from "@atomist/sdm-core";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm/api/machine/SoftwareDeliveryMachineOptions";
import { LocalLifecycle } from "../machine/localLifecycle";
import { configureLocal } from "../machine/localPostProcessor";

function createMachine(config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine {
    const sdm: SoftwareDeliveryMachine = createSoftwareDeliveryMachine(
        {
            name: "Bootstrap Slalom machine",
            configuration: config,
        });
    sdm.addExtensionPacks(LocalLifecycle);
    return sdm;
}

function configurationFor(repositoryOwnerParentDirectory: string): Configuration {
    const cfg = defaultConfiguration();
    cfg.name = "@atomist/slalom-bootstrap";
    cfg.http.port = 2867;

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

export async function createBootstrapMachine(repositoryOwnerParentDirectory: string): Promise<any> {
    const client = automationClient(configurationFor(repositoryOwnerParentDirectory));
    return client.run();
}
