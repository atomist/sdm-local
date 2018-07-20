import { HandlerResult, logger } from "@atomist/automation-client";
import { Arg, Secret } from "@atomist/automation-client/internal/invoker/Payload";
import { AutomationClientConnectionConfig } from "../config";

import * as assert from "power-assert";
import { hasOwnProperty } from "tslint/lib/utils";
import { postToSdm } from "./httpInvoker";
import { isArray } from "util";

/**
 * Allow params to be expressed in an object for convenience
 */
export interface Params {

    [propName: string]: string | number;
}

export interface CommandHandlerInvocation {
    name: string;
    parameters: Params | Arg[];
    mappedParameters?: Params;
    secrets?: Secret[];
}

export async function invokeCommandHandler(config: AutomationClientConnectionConfig,
                                           invocation: CommandHandlerInvocation): Promise<HandlerResult> {
    assert(!!config, "Config must be provided");
    assert(!!config.baseEndpoint, "Base endpoint must be provided: saw " + JSON.stringify(config));
    const url = `/command`;
    const data = {
        command: invocation.name,
        parameters: propertiesToArgs(invocation.parameters),
        // TODO use factory
        // mapped_parameters: propertiesToArgs(invocation.mappedParameters || {}).concat([
        //     {name: "slackTeam", value: config.atomistTeamId},
        //     // TODO fix this
        //     {name: "target.webhookUrl", value: "foo"},
        //     {name: "target.owner", value: config.githubOrg},
        //
        // ]),
        secrets: (invocation.secrets || []).concat([
            {uri: "github://user_token?scopes=repo,user:email,read:user", value: process.env.GITHUB_TOKEN},
        ]),
        correlation_id: "test-" + new Date().getTime(),
        api_version: "1",
        team: {
            id: config.atomistTeamId,
            name: config.atomistTeamName,
        },
    };
    logger.info("Hitting %s to test command %s using %j", url, invocation.name, data);
    const resp = await postToSdm(config, url, data);
    assert(resp.data.code === 0,
        "Command handler did not succeed. Returned: " + JSON.stringify(resp.data, null, 2));
    return resp.data;
}

function propertiesToArgs(o: any): Arg[] {
    if (isArray(o)) {
        return o;
    }
    const args = [];
    for (const name in o) {
        if (hasOwnProperty(o, name)) {
            args.push({name, value: o[name]});
        }
    }
    return args;
}
