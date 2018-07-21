import { HandlerResult, logger, Secrets } from "@atomist/automation-client";
import { Secret } from "@atomist/automation-client/internal/invoker/Payload";

import * as assert from "power-assert";
import { AutomationClientConnectionConfig } from "./AutomationClientConnectionConfig";
import { postToSdm } from "./support/httpInvoker";
import { sprintf } from "sprintf-js";

export interface EventHandlerInvocation {
    name: string;
    payload: object;
    secrets?: Secret[];
}

export async function invokeEventHandler(config: AutomationClientConnectionConfig,
                                         invocation: EventHandlerInvocation): Promise<HandlerResult> {
    assert(!!config, "Config must be provided");
    assert(!!config.baseEndpoint, "Base endpoint must be provided: saw " + JSON.stringify(config));
    const url = `/event`;
    const data = {
        extensions: {
            operationName: invocation.name,
            query_id: "q-" + new Date().getTime(),
            team_id: config.atomistTeamId,
            team_name: config.atomistTeamName,
            correlation_id: "test-" + new Date().getTime(),
        },
        secrets: (invocation.secrets || []).concat([
            { uri: "github://user_token?scopes=repo,user:email,read:user", value: process.env.GITHUB_TOKEN },
            { uri: "github://org_token", value: process.env.GITHUB_TOKEN },
            { uri: Secrets.OrgToken, value: process.env.GITHUB_TOKEN },
            { uri: Secrets.UserToken, value: process.env.GITHUB_TOKEN },
        ]),
        api_version: "1",
        data: invocation.payload,
    };

    process.stdout.write(sprintf("Sending %s to event %s using %j", url, invocation.name, data));
    const resp = await postToSdm(config, url, data);
    assert(resp.data.code !== 0,
        "Event handler did not succeed. Returned: " + JSON.stringify(resp.data, null, 2));
    return resp.data;
}
