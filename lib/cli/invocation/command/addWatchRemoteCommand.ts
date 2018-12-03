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

import { determineDefaultRepositoryOwnerParentDirectory } from "../../../sdm/configuration/defaultLocalSoftwareDeliveryMachineConfiguration";
import {
    errorMessage,
    infoMessage,
    logExceptionsToConsole,
} from "../../ui/consoleOutput";
import { ScmFeedCriteria } from "./support/scm-feed/FeedEvent";
import { GitHubActivityFeedEventReader } from "./support/scm-feed/GitHubActivityFeedEventReader";
import { DefaultPollingIntervalSeconds, startWatching } from "./support/scm-feed/watcher";
import { YargBuilder } from "./support/yargBuilder";

/**
 * Watch the given SCM org, updating any projects we have cloned.
 * This will fire events to any running SDMs.
 * @param {YargBuilder} yargs
 */
export function addWatchRemoteCommand(yargs: YargBuilder) {
    yargs.command({
        command: "watch remote <args>",
        describe: "Watch directories cloned from the given SCM org " +
        `under the Atomist root at ${determineDefaultRepositoryOwnerParentDirectory()}`,
        builder: a => {
            a.option("provider", {
                type: "string",
                default: "github",
                description: "SCM provider",
                required: false,
                choices: ["github"],
            }).option("seconds", {
                type: "number",
                default: 30,
                description: "Seconds to wait between polling",
                required: false,
            }).option("owner", {
                type: "string",
                required: true,
                description: "GitHub org to pass",
            }).option("user", {
                type: "boolean",
                required: false,
                default: false,
                description: "Is this owner a user rather than an org?",
            }).option("apiBase", {
                type: "string",
                required: false,
                default: undefined,
                description: "API base. Defaults to github.com. Specify for GitHub enterprise",
            });
            return a;
        },
        handler: args => initiateWatch(args as any),
    });
}

export async function initiateWatch(args: {
    owner: string,
    user?: boolean,
    apiBase?: string,
    provider: "github",
    seconds?: number,
}): Promise<void> {
    const token: string = process.env.GITHUB_TOKEN || undefined;
    const intervalSeconds = args.seconds || DefaultPollingIntervalSeconds;
    infoMessage("Starting polling GitHub owner %s every %d seconds...\n", args.owner, intervalSeconds);
    infoMessage("Terminate process to stop polling. An SDM must be running\n");
    const criteria: ScmFeedCriteria = {
        owner: args.owner,
        user: args.user === true,
        token,
        apiBase: args.apiBase,
    };
    if (args.provider !== "github") {
        errorMessage("Only GitHub polling supported for now");
        process.exit(1);
    }
    const feedEventReader = new GitHubActivityFeedEventReader(criteria);
    await logExceptionsToConsole(async () => {
        await startWatching(criteria, {
            repositoryOwnerParentDirectory: determineDefaultRepositoryOwnerParentDirectory(),
            intervalSeconds: args.seconds,
            feedEventReader,
        });
    }, true);
}
