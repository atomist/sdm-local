import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { LocalMachineConfig } from "..";
import { AutomationClientConnectionConfig } from "./http/AutomationClientConnectionConfig";

/**
 * Information held in client about an automation client that we've connected to
 */
export interface AutomationClientInfo {

    commandsMetadata: CommandHandlerMetadata[];

    connectionConfig: AutomationClientConnectionConfig;

    /**
     * If this is a local machine, include this
     */
    localConfig?: LocalMachineConfig;
}
