/**
 * Find automation clients
 */
import { AutomationClientInfo } from "../../AutomationClientInfo";

export interface AutomationClientFinder {

    /**
     * Return the automation client urls we've found
     */
    findAutomationClients(): Promise<AutomationClientInfo[]>;
}
