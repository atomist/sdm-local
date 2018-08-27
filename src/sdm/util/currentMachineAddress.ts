import { automationClientInstance } from "@atomist/automation-client";
import * as _ from "lodash";
import { AutomationClientConnectionRequest } from "../../cli/invocation/http/AutomationClientConnectionRequest";
import { defaultHostUrlAliaser } from "../../common/util/http/defaultLocalHostUrlAliaser";

/**
 * Identify the address of the automation client we're running within
 */
export function currentMachineAddress(): AutomationClientConnectionRequest {
    const aci = automationClientInstance();
    if (!aci) {
        throw new Error("Internal error: No automation client appears to be running when trying to identify port to dispatch back to");
    }
    const port = _.get(aci, "configuration.http.port", 2866);
    return {
        baseEndpoint: `http://${defaultHostUrlAliaser().alias()}:${port}`,
    };
}
