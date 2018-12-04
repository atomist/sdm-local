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

import { AdminCommunicationContext, ExtensionPack, metadata } from "@atomist/sdm";
import { initiateWatch } from "../../cli/invocation/command/addWatchRemoteCommand";

/**
 * An extension pack for watching a single remote SCM.
 * Currently supports only GitHub.
 *
 * Configuration:
 * sdm.scm.owner configuration is required -- name of your GitHub owner
 * sdm.scm.user should be "true" if this is the name of an owner, not an org
 * sdm.scm.intervalSeconds changes the polling interval, which defaults to 10 seconds
 * sdm.scm.apiBase enables you to set your GHE server: default is GitHub.com
 *
 * You must also set GITHUB_TOKEN in your environment.
 */
export const WatchGitHub: ExtensionPack = {
    ...metadata("watch-github"),
    // requiredConfigurationValues: [
    //     {
    //         path: "sdm.watch.github.owner",
    //         type: ConfigurationValueType.String,
    //     },
    // ],
    configure: sdm => {
        sdm.addStartupListener(startListening);
    },
};

async function startListening(cc: AdminCommunicationContext): Promise<void> {
    const owner = cc.sdm.configuration.sdm.watch.github.owner || process.env.GITHUB_OWNER;
    if (!owner) {
        throw new Error("Configuration key 'sdm.watch.github.owner' or environment variable GITHUB_OWNER must be set to watch GitHub");
    }
    return initiateWatch({
        owner,
        provider: "github",
        apiBase: cc.sdm.configuration.sdm.watch.github.apiBase,
        seconds: cc.sdm.configuration.sdm.watch.github.intervalSeconds,
        user: !!cc.sdm.configuration.sdm.watch.github.user,
    });
}
