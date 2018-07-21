import axios from "axios";
import { LocalMachineConfig } from "../..";
import { AutomationClientInfo, DefaultConfig } from "../AutomationClientInfo";
import { AutomationClientConnectionConfig } from "./AutomationClientConnectionConfig";

/**
 * Call into an SDM at the given location and retrieve metadata
 * @param {AutomationClientConnectionConfig} connectionConfig
 * @return {Promise<AutomationClientInfo>}
 */
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
