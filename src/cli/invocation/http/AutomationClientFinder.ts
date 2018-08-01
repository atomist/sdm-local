/**
 * Find automation clients
 */
export interface AutomationClientFinder {

    /**
     * Return the automation client urls we've found
     */
    findAutomationClientUrls(): Promise<string[]>;
}