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

import { logger } from "@atomist/sdm";
import * as assert from "power-assert";
import { CommandHandlerInvoker } from "../../../common/invocation/CommandHandlerInvocation";
import { propertiesToArgs } from "../../../common/util/propertiesToArgs";
import { AutomationClientConnectionRequest } from "./AutomationClientConnectionRequest";
import { postToSdm } from "./support/httpInvoker";
import { newCliCorrelationId } from "./support/newCorrelationId";

export function invokeCommandHandlerUsingHttp(config: AutomationClientConnectionRequest): CommandHandlerInvoker {
    return async invocation => {
        const parameters = propertiesToArgs(invocation.parameters);
        const data = {
            command: invocation.name,
            parameters,
            mapped_parameters: propertiesToArgs(invocation.mappedParameters || {}).concat([
                { name: "slackTeam", value: invocation.workspaceId },
            ]).concat(parameters), // mapped parameters can also be passed in
            secrets: (invocation.secrets || []).concat([
                { uri: "github://user_token?scopes=repo,user:email,read:user", value: process.env.GITHUB_TOKEN },
            ]),
            correlation_id: invocation.correlationId || await newCliCorrelationId(),
            api_version: "1",
            team: {
                id: invocation.workspaceId,
                name: invocation.workspaceName,
            },
        };

        assert(!!config, "Config must be provided");
        assert(!!config.baseEndpoint, "Base endpoint must be provided: saw " + JSON.stringify(config));
        const url = `/command`;
        logger.debug("Hitting %s to invoke command %s using %j", url, invocation.name, data);
        const resp = await postToSdm(config, url, data);
        if (resp.code !== 0) {
            logger.error("Command handler did not succeed. Returned: " + JSON.stringify(resp, null, 2));
        }
        return resp;
    };
}
