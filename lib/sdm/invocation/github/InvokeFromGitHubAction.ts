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
    AutomationClient,
    AutomationEventListenerSupport,
    EventIncoming,
    logger,
} from "@atomist/automation-client";
import {
    OnPushToAnyBranch,
    OwnerType,
    ProviderType,
} from "@atomist/sdm";
import { DefaultGitHubApiUrl } from "@atomist/sdm-core/lib/util/lifecycleHelpers";
import * as fs from "fs-extra";
import * as os from "os";
import { newCliCorrelationId } from "../../../cli/invocation/http/support/newCorrelationId";

export class InvokeFromGitHubAction extends AutomationEventListenerSupport {

    public async startupSuccessful(client: AutomationClient): Promise<void> {
        const event = process.env.GITHUB_EVENT_NAME;
        switch (event) {
            case "push":
                return handlePush(client);
                break;
            default:
                logger.info(`Unknown GitHub event '${event}'`);
        }
    }
}

async function handlePush(client: AutomationClient): Promise<void> {
    const event = await fs.readJSON(process.env.GITHUB_EVENT_PATH);

    const push: OnPushToAnyBranch.Push = {
        repo: {
            owner: event.repository.owner.name,
            name: event.repository.name,
            defaultBranch: event.repository.default_branch,
            org: {
                owner: event.repository.owner.name,
                ownerType: event.repository.owner.type === "User" ? OwnerType.user : OwnerType.organization,
                provider: {
                    providerId: "zjlmxjzwhurspem",
                    apiUrl: DefaultGitHubApiUrl,
                    url: "https://github.com/",
                    providerType: ProviderType.github_com,
                },
            },
            channels: [],
        },
        branch: event.ref.startsWith("refs/heads/") ? event.ref.replace("refs/heads/", "") : event.ref,
        after: {
            sha: event.after,
            committer: {
                login: event.sender.login,
            },
        },
        before: {
            sha: event.before,
        },
        commits: event.commits.map((c: any) => ({
            sha: c.sha,
            message: c.message,
            timestamp: c.timestamp,
        })),
    };

    const ei: EventIncoming = {
        data: {
            Push: [push],
        },
        extensions: {
            operationName: "SetGoalsOnPush",
            correlation_id: await newCliCorrelationId(),
            team_id: client.configuration.workspaceIds && client.configuration.workspaceIds.length > 0
                ? client.configuration.workspaceIds[0] : event.repository.owner.name,
            team_name: os.hostname(),
        },
        secrets: [],
    };

    await client.httpHandler.processEvent(ei, async results => {
        const r = await results;
        logger.info(`Returned '${JSON.stringify(r)}'`);
    });
}
