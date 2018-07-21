import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";

export function resolveConnectionConfig(): AutomationClientConnectionConfig {
    return DefaultConfig;
}

// TODO get from config?
export const DefaultConfig: AutomationClientConnectionConfig = {
    atomistTeamId: "T123",
    atomistTeamName: "test",
    baseEndpoint: "http://127.0.0.1:2866",
};
