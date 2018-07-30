/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    HandlerResult,
    logger,
    Secrets,
} from "@atomist/automation-client";
import { Secret } from "@atomist/automation-client/internal/invoker/Payload";
import { replacer } from "@atomist/automation-client/internal/transport/AbstractRequestProcessor";
import * as stringify from "json-stringify-safe";
import * as assert from "power-assert";
import { newCorrelationId } from "../../machine/correlationId";
import { AutomationClientConnectionConfig } from "./AutomationClientConnectionConfig";
import { postToSdm } from "./support/httpInvoker";

export interface EventHandlerInvocation {
    name: string;
    payload: object;
    secrets?: Secret[];
}

/**
 * Invoke an event handler on the automation client at the given location
 * @param {AutomationClientConnectionConfig} config
 * @param {EventHandlerInvocation} invocation
 * @return {Promise<HandlerResult>}
 */
export async function invokeEventHandler(config: AutomationClientConnectionConfig,
                                         invocation: EventHandlerInvocation,
                                         correlationId?: string): Promise<HandlerResult> {
    assert(!!config, "Config must be provided");
    assert(!!config.baseEndpoint, "Base endpoint must be provided: saw " + JSON.stringify(config));
    const url = `/event`;
    const data = {
        extensions: {
            operationName: invocation.name,
            query_id: "q-" + new Date().getTime(),
            team_id: config.atomistTeamId,
            team_name: config.atomistTeamName,
            correlation_id: correlationId || newCorrelationId(),
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

    logger.info("Sending %s to event %s using %s", url, invocation.name, stringify(data, replacer));
    const resp = await postToSdm(config, url, data);
    assert(resp.code !== 0,
        "Event handler did not succeed. Returned: " + JSON.stringify(resp, null, 2));
    return resp;
}
