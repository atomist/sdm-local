import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { AutomationClientClientConfig, DefaultConfig } from "../config";
import axios, { AxiosError, AxiosPromise, AxiosResponse } from "axios";

export async function getMetadata(config: AutomationClientClientConfig = DefaultConfig): Promise<CommandHandlerMetadata[]> {
    const resp = await axios.get(config.baseEndpoint + "/registration");
    return resp.data.commands;
}
