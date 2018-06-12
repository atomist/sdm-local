import { configure } from "../configure";
import { loadConfiguration } from "../machine/loadConfiguration";
import { LocalSoftwareDeliveryMachine } from "../machine/LocalSoftwareDeliveryMachine";
import { CliMappedParameterResolver } from "./cli/support/CliMappedParameterResolver";

function failWith(message: string): string {
    throw new Error(message);
}

export const RepositoryOwnerParentDirectory = process.env.SDM_PROJECTS_ROOT ||
    failWith("Please define SDM_PROJECTS_ROOT to a directory containing git repositories, in the form of owner/repository");

export const localSdmInstance = new LocalSoftwareDeliveryMachine(
    "gitMachine",
    loadConfiguration(
        RepositoryOwnerParentDirectory,
        {
            mergeAutofixes: true,
            mappedParameterResolver: new CliMappedParameterResolver(RepositoryOwnerParentDirectory),
        }));

configure(localSdmInstance);
