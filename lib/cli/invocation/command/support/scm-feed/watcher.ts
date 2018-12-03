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

import { exec } from "child_process";
import * as fs from "fs-extra";
import { promisify } from "util";
import { dirFor } from "../../../../../sdm/binding/project/expandedTreeUtils";
import { infoMessage } from "../../../../ui/consoleOutput";
import { doForever } from "../../../../../common/util/scheduling";
import { FeedEventReader, isPushEvent, ScmFeedCriteria } from "./FeedEvent";

export const DefaultPollingIntervalSeconds = 10;

export async function startWatching(criteria: ScmFeedCriteria,
                                    setup: {
                                        repositoryOwnerParentDirectory: string,
                                        intervalSeconds?: number,
                                        feedEventReader: FeedEventReader,
                                    }): Promise<void> {
    await doForever(async () => {
        await updateClonedProjects(criteria, setup);
    }, 1000 * (setup.intervalSeconds || DefaultPollingIntervalSeconds));
}

/**
 * Update projects based on commit criteria
 * @param {{repositoryOwnerParentDirectory: string}} setup
 * @return {Promise<void>}
 */
async function updateClonedProjects(
    criteria: ScmFeedCriteria,
    setup: {
        repositoryOwnerParentDirectory: string,
        feedEventReader: FeedEventReader,
    }): Promise<void> {
    infoMessage("Reading SCM activity feed for %s...", criteria.owner);
    const newEvents = (await setup.feedEventReader.readNewEvents())
        .filter(isPushEvent);
    for (const pushEvent of newEvents) {
        // Update to events
        const repoName = pushEvent.repo.name.substring(pushEvent.repo.name.indexOf("/"));
        const dir = dirFor(setup.repositoryOwnerParentDirectory, criteria.owner, repoName);
        if (!fs.existsSync(dir)) {
            infoMessage(`Updating directory at: '${dir}'`);
            // Update. Must not update this directory.
            await promisify(exec)("git pull", { cwd: dir });
        } else {
            infoMessage(`Ignoring push to ${repoName} as expected directory does not exist: '${dir}'`);
        }
    }
}
