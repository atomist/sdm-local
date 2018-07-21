import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { LocalMachineConfig } from "..";
import { AutomationClientConnectionConfig } from "./http/AutomationClientConnectionConfig";

/**
 * Information about an automation client that we've connected to
 */
export interface AutomationClientInfo {

    commandsMetadata: CommandHandlerMetadata[];

    connectionConfig: AutomationClientConnectionConfig;

    /**
     * If this is a local machine, include this
     */
    localConfig?: LocalMachineConfig;
}

// TODO get from config?
export const DefaultConfig: AutomationClientConnectionConfig = {
    atomistTeamId: "T123",
    atomistTeamName: "test",
    baseEndpoint: "http://127.0.0.1:2866",
};
