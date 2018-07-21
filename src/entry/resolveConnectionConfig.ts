import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";
import { DefaultConfig } from "../invocation/AutomationClientInfo";

export function resolveConnectionConfig(): AutomationClientConnectionConfig {
    return DefaultConfig;
}
