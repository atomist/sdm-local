import { Configuration } from "@atomist/automation-client";
import { SoftwareDeliveryMachine, SoftwareDeliveryMachineOptions } from "@atomist/sdm";
import { configureSdm, createSoftwareDeliveryMachine, } from "@atomist/sdm-core";
import { SoftwareDeliveryMachineConfiguration } from "@atomist/sdm/api/machine/SoftwareDeliveryMachineOptions";
import { automationClient } from "@atomist/automation-client/automationClient";
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
    return {
        name: "slalom-bootstrap",
        version: "0.1.0",
        sdm: {
            // projectLoader: new CachingProjectLoader(new LazyProjectLoader(CloningProjectLoader)),
        } as Partial<SoftwareDeliveryMachineOptions>,
        http: {
            // auth: {
            //     basic: {
            //         enabled: false,
            //         username: "admin",
            //         password: process.env.LOCAL_ATOMIST_ADMIN_PASSWORD,
            //     },
            // },
            port: 2867,
        },
        cluster: {
            workers: 1,
        },
        logging: {
            level: "info",
            file: {
                enabled: false,
            },
        },
        statsd: {
            enabled: false,
        },
        ws: {
            enabled: false,
        },
        applicationEvents: {
            enabled: false,
        },
        commands: [],
        events: [],
        ingesters: [],
        postProcessors: [
            configureLocal({
                repositoryOwnerParentDirectory,
                mergeAutofixes: true,
                preferLocalSeeds: false,
            }),
            configureSdm(createMachine, {}),
        ],
    };
}

export async function createBootstrapMachine(repositoryOwnerParentDirectory: string): Promise<any> {
    const client = automationClient(configurationFor(repositoryOwnerParentDirectory));
    return client.run();
}
