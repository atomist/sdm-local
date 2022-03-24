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

// tslint:disable-next-line:import-blacklist
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import * as _ from "lodash";
import { AutomationClientConnectionRequest } from "../AutomationClientConnectionRequest";
import { HandlerResult } from "@atomist/sdm/lib/client";
import { logger } from "@atomist/automation-client/lib/util/logger";

/**
 * Make a post to the SDM
 * @param {AutomationClientConnectionConfig} config
 * @param {string} relativePath
 * @param data
 * @return {AxiosPromise}d
 */
export function postToSdm(config: AutomationClientConnectionRequest, relativePath: string, data: any): Promise<HandlerResult> {
    let url = `${config.baseEndpoint}/${relativePath}`;
    if (relativePath.startsWith("/")) {
        url = `${config.baseEndpoint}${relativePath}`;
    }
    logger.debug("POST to %s with payload %j", url, data);
    return axios.post(url, data, automationServerAuthHeaders(config))
        .then(logResponse(url), interpretSdmResponse(config, url));
}

function logResponse(url: string): (resp: AxiosResponse) => HandlerResult {
    return (resp: AxiosResponse): HandlerResult => {
        logger.debug(`Response from %s was %d, data %j`, url, resp.status, resp.data);
        return resp.data;
    };
}

function interpretSdmResponse(config: AutomationClientConnectionRequest, url: string): (err: AxiosError) => HandlerResult {
    return (err: AxiosError): HandlerResult => {
        logger.error("Error accessing %s: %s", url, err.message);
        if (_.get(err, "message", "").includes("ECONNREFUSED")) {
            const linkThatDemonstratesWhyTheSdmMightNotBeListening =
                "https://github.com/atomist/github-sdm/blob/acd5f89cb2c3e96fa47ef85b32b2028ea2e045fb/src/atomist.config.ts#L62";
            logger.error("The SDM is not running or is not accepting connections.\n" +
                "If it's running, check its environment variables. See: " + linkThatDemonstratesWhyTheSdmMightNotBeListening);
            return {
                code: 1,
                message: "Unable to connect to the SDM at " + config.baseEndpoint,
            };
        }
        if (_.get(err, "response.status") === 401) {
            return {
                code: 1,
                message: `Status 401 trying to contact the SDM. You are connecting as: [ ${config.user}:${config.password} ]`,
            };
        }
        return { code: 1, message: err.message };
    };
}

function automationServerAuthHeaders(config: AutomationClientConnectionRequest): AxiosRequestConfig {
    return {
        headers: {
            "content-type": "application/json",
            "Cache-Control": "no-cache",
        },
        auth: {
            username: config.user,
            password: config.password,
        },
    };
}
