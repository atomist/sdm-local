import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";

// TODO smoke tests should depend on this
export interface AutomationClientClientConfig {

    atomistTeamId: string;

    atomistTeamName: string;

    baseEndpoint: string;

    user?: string;

    password?: string;

    credentials?: ProjectOperationCredentials;
}

// TODO get from config?
export const DefaultConfig: AutomationClientClientConfig = {
    atomistTeamId: "T123",
    atomistTeamName: "test",
    baseEndpoint: "http://127.0.0.1:2866",
}
