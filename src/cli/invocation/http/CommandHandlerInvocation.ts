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
} from "@atomist/automation-client";
import {
    Arg,
    Secret,
} from "@atomist/automation-client/internal/invoker/Payload";
import * as assert from "power-assert";
import { isArray } from "util";
import { newCorrelationId } from "../../../sdm/machine/correlationId";
import { AutomationClientConnectionConfig } from "./AutomationClientConnectionConfig";
import { postToSdm } from "./support/httpInvoker";

/**
 * Allow params to be expressed in an object for convenience
 */
export interface Params {

    [propName: string]: string | number;
}

export interface CommandHandlerInvocation {
    name: string;
    parameters: Params | Arg[];
    mappedParameters?: Params | Arg[];
    secrets?: Secret[];
}

export async function invokeCommandHandler(config: AutomationClientConnectionConfig,
                                           invocation: CommandHandlerInvocation,
                                           correlationId?: string): Promise<HandlerResult> {
    assert(!!config, "Config must be provided");
    assert(!!config.baseEndpoint, "Base endpoint must be provided: saw " + JSON.stringify(config));
    const url = `/command`;
    const data = {
        command: invocation.name,
        parameters: propertiesToArgs(invocation.parameters),
        mapped_parameters: propertiesToArgs(invocation.mappedParameters || {}).concat([
            {name: "slackTeam", value: config.atomistTeamId},
        ]),
        secrets: (invocation.secrets || []).concat([
            {uri: "github://user_token?scopes=repo,user:email,read:user", value: process.env.GITHUB_TOKEN},
        ]),
        correlation_id: correlationId || newCorrelationId(),
        api_version: "1",
        team: {
            id: config.atomistTeamId,
            name: config.atomistTeamName,
        },
    };
    logger.debug("Hitting %s to invoke command %s using %j", url, invocation.name, data);
    const resp = await postToSdm(config, url, data);
    assert(resp.code === 0,
        "Command handler did not succeed. Returned: " + JSON.stringify(resp, null, 2));
    return resp;
}

function propertiesToArgs(o: any): Arg[] {
    if (isArray(o)) {
        return o;
    }
    const args = [];
    for (const name in o) {
        if (o.hasOwnProperty(o)) {
            args.push({name, value: o[name]});
        }
    }
    return args;
}
