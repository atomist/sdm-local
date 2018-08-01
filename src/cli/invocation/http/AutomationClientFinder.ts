/**
 * Find automation clients
 */
import { AutomationClientInfo } from "../../AutomationClientInfo";

/**
 * Implemented by types that can find automation clients on a local server.
 */
export interface AutomationClientFinder {

    /**
     * Return the automation client urls we've found
     */
    findAutomationClients(): Promise<AutomationClientInfo[]>;
}
