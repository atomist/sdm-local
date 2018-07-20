import { AutomationClientConnectionConfig, AutomationClientInfo, DefaultConfig } from "../config";
import axios from "axios";
import { LocalMachineConfig } from "../..";

export async function getMetadata(connectionConfig: AutomationClientConnectionConfig = DefaultConfig): Promise<AutomationClientInfo> {
    const resp = await axios.get(connectionConfig.baseEndpoint + "/registration");
    const commandsMetadata = resp.data.commands;
    let localConfig: LocalMachineConfig;
    try {
        localConfig = (await axios.get(connectionConfig.baseEndpoint + "/localConfiguration")).data;
    } catch {
        // Do nothing
    }
    return {
        commandsMetadata,
        localConfig,
        connectionConfig,
    };
}
