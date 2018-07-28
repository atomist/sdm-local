import { HandlerResult, logger } from "@atomist/automation-client";
import axios, { AxiosError, AxiosResponse } from "axios";
import { AxiosRequestConfig } from "axios";
import * as _ from "lodash";
import { AutomationClientConnectionConfig } from "../AutomationClientConnectionConfig";

/**
 * Make a post to the SDM
 * @param {AutomationClientConnectionConfig} config
 * @param {string} relativePath
 * @param data
 * @return {AxiosPromise}
 */
export function postToSdm(config: AutomationClientConnectionConfig, relativePath: string, data: any): Promise<HandlerResult> {
    let url = `${config.baseEndpoint}/${relativePath}`;
    if (relativePath.startsWith("/")) {
        url = `${config.baseEndpoint}${relativePath}`;
    }
    logger.debug("POST to %s with payload %j", url, data);
    return axios.post(url, data, automationServerAuthHeaders(config))
        .then(logResponse(url), interpretSdmResponse(config, url));
}

function logResponse(url: string) {
    return (resp: AxiosResponse): HandlerResult => {
        logger.debug(`Response from %s was %d, data %j`, url, resp.status, resp.data);
        return resp.data;
    };
}

function interpretSdmResponse(config: AutomationClientConnectionConfig, url: string) {
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

function automationServerAuthHeaders(config: AutomationClientConnectionConfig): AxiosRequestConfig {
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
