
/**
 * How to connect to an automation client
 */
export interface AutomationClientConnectionConfig {

    atomistTeamId: string;

    atomistTeamName: string;

    /**
     * Base endpoint, including port
     */
    baseEndpoint: string;

    user?: string;

    password?: string;

    /**
     * Whether to display error stacks to console
     */
    showErrorStacks?: boolean;

}
