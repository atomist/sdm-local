import axios from "axios";
import { LocalMachineConfig } from "../..";
import { AutomationClientInfo } from "../AutomationClientInfo";
import { errorMessage, infoMessage } from "../cli/support/consoleOutput";
import { AutomationClientConnectionConfig } from "./AutomationClientConnectionConfig";

/**
 * Call into an automation client at the given location and retrieve metadata
 * @param {AutomationClientConnectionConfig} connectionConfig
 * @return {Promise<AutomationClientInfo>}
 */
export async function fetchMetadataFromAutomationClient(connectionConfig: AutomationClientConnectionConfig): Promise<AutomationClientInfo> {
    infoMessage("Connecting to Automation client at %s (%d)\n", connectionConfig.baseEndpoint, process.pid);
    try {
        const resp = await axios.get(connectionConfig.baseEndpoint + "/registration", {
            timeout: 5 * 1000,
        });
        const commandsMetadata = resp.data.commands;
        let localConfig: LocalMachineConfig;
        try {
            localConfig = (await axios.get(connectionConfig.baseEndpoint + "/localConfiguration")).data;
        } catch {
            // Do nothing. The automation client we're talking to is not in local mode
        }
        return {
            commandsMetadata,
            localConfig,
            connectionConfig,
        };
    } catch (e) {
        errorMessage("Unable to connect to '%s': Is the automation client running?\n\t(%s)",
            connectionConfig.baseEndpoint, e);
        process.exit(1);
    }
}
