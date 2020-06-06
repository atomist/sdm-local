/*
 * Copyright © 2019 Atomist, Inc.
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

import * as assert from "power-assert";
import { CommandHandlerInvoker } from "../../../common/invocation/CommandHandlerInvocation";
import { propertiesToArgs } from "../../../common/util/propertiesToArgs";
import { credentialsFromEnvironment } from "../../../sdm/binding/EnvironmentTokenCredentialsResolver";
import { AutomationClientConnectionRequest } from "./AutomationClientConnectionRequest";
import { postToSdm } from "./support/httpInvoker";
import { newCliCorrelationId } from "./support/newCorrelationId";
import {logger} from "@atomist/automation-client/lib/util/logger";

/**
 * Return a command invoker using HTTP to the given address
 * @param {AutomationClientConnectionRequest} location
 * @return {CommandHandlerInvoker}
 */
export function invokeCommandHandlerUsingHttp(location: AutomationClientConnectionRequest): CommandHandlerInvoker {
    return async invocation => {
        const parameters = propertiesToArgs(invocation.parameters);
        const data = {
            command: invocation.name,
            parameters,
            mapped_parameters: propertiesToArgs(invocation.mappedParameters || {}).concat([
                { name: "slackTeam", value: invocation.workspaceId },
            ]).concat(parameters), // mapped parameters can also be passed in
            secrets: (invocation.secrets || []).concat([
                { uri: "github://user_token?scopes=repo,user:email,read:user", value: credentialsFromEnvironment().token },
            ]),
            correlation_id: invocation.correlationId || await newCliCorrelationId(),
            api_version: "1",
            team: {
                id: invocation.workspaceId,
                name: invocation.workspaceName,
            },
        };

        assert(!!location, "Config must be provided");
        assert(!!location.baseEndpoint, "Base endpoint must be provided: saw " + JSON.stringify(location));
        const url = `/command`;
        logger.debug("Hitting %s to invoke command %s using %j", url, invocation.name, data);
        const resp = await postToSdm(location, url, data);
        if (resp.code !== 0) {
            logger.error("Command handler did not succeed. Returned: " + JSON.stringify(resp, undefined, 2));
        }
        return resp;
    };
}
