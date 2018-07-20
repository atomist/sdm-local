import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";
import { LocalMachineConfig } from "..";
import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";

export interface AutomationClientConnectionConfig {

    atomistTeamId: string;

    atomistTeamName: string;

    baseEndpoint: string;

    user?: string;

    password?: string;

    credentials?: ProjectOperationCredentials;

}

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
}
