import { DefaultConfig } from "../invocation/AutomationClientInfo";
import { AutomationClientConnectionConfig } from "../invocation/http/AutomationClientConnectionConfig";

export function resolveConnectionConfig(): AutomationClientConnectionConfig {
    return DefaultConfig;
}
