
import { logger } from "@atomist/automation-client";
import axios, { AxiosError, AxiosPromise, AxiosResponse } from "axios";
import { AxiosRequestConfig } from "axios";
import { AutomationClientClientConfig } from "../config";

/**
 * Make a post to the SDM
 * @param {AutomationClientClientConfig} config
 * @param {string} relativePath
 * @param data
 * @return {AxiosPromise}
 */
export function postToSdm(config: AutomationClientClientConfig, relativePath: string, data: any): AxiosPromise {
    let url = `${config.baseEndpoint}/${relativePath}`;
    if (relativePath.startsWith("/")) {
        url = `${config.baseEndpoint}${relativePath}`;
    }
    logger.debug("POST to %s with payload %j", url, data);
    return axios.post(url, data, automationServerAuthHeaders(config))
        .then(logResponse(url), interpretSdmResponse(config, url));
}

export function sdmGet(config: AutomationClientClientConfig, relativePath: string): AxiosPromise {
    let url = `${config.baseEndpoint}/${relativePath}`;
    if (relativePath.startsWith("/")) {
        url = `${config.baseEndpoint}${relativePath}`;
    }
    logger.debug("GET %s");
    return axios.get(url, automationServerAuthHeaders(config))
        .then(logResponse(url), interpretSdmResponse(config, url));
}

function logResponse(url: string) {
    return (resp: AxiosResponse): AxiosResponse => {
        logger.debug(`Response from %s was %d, data %j`, url, resp.status, resp.data);
        return resp;
    };
}

function interpretSdmResponse(config: AutomationClientClientConfig, url: string) {
    return (err: AxiosError): never => {
        logger.error("Error accessing %s: %s", url, err.message);
        if (err.message.includes("ECONNREFUSED")) {
            const linkThatDemonstratesWhyTheSdmMightNotBeListening =
                "https://github.com/atomist/github-sdm/blob/acd5f89cb2c3e96fa47ef85b32b2028ea2e045fb/src/atomist.config.ts#L62";
            logger.error("The SDM is not running or is not accepting connections.\n" +
                "If it's running, check its environment variables. See: " + linkThatDemonstratesWhyTheSdmMightNotBeListening);
            throw new Error("Unable to connect to the SDM at " + config.baseEndpoint);
        }
        if (err.response.status === 401) {
            throw new Error(`Status 401 trying to contact the SDM. You are connecting as: [ ${config.user}:${config.password} ]`);
        }
        throw err;
    };
}

function automationServerAuthHeaders(config: AutomationClientClientConfig): AxiosRequestConfig {
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
