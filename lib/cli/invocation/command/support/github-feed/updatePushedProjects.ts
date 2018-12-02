import { exec } from "child_process";
import * as fs from "fs-extra";
import { promisify } from "util";
import { dirFor } from "../../../../../sdm/binding/project/expandedTreeUtils";
import { infoMessage } from "../../../../ui/consoleOutput";
import { FeedCriteria, isPushEvent, PushEvent, readGitHubActivityFeed } from "./gitHubActivityFeed";

// Events we've already seen in this process
const alreadySeen: PushEvent[] = [];

/**
 * Update projects based on commit criteria
 * @param {FeedCriteria} criteria
 * @param {{repositoryOwnerParentDirectory: string}} setup
 * @return {Promise<void>}
 */
export async function updatePushedProjects(criteria: FeedCriteria,
                                           setup: {
                                               repositoryOwnerParentDirectory: string,
                                           }): Promise<void> {
    infoMessage("Reading GitHub activity feed for %s...", criteria.owner);
    const newEvents = (await readGitHubActivityFeed(criteria))
        .filter(isPushEvent)
        .filter(pe => !alreadySeen.some(seen => seen.id === pe.id));
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
    alreadySeen.push(...newEvents);
}
