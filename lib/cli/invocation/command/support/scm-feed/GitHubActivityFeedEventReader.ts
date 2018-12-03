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

import { authHeaders } from "@atomist/sdm-core/lib/util/github/ghub";
import axios from "axios";
import { FeedEvent, FeedEventReader, ScmFeedCriteria } from "./FeedEvent";

export class GitHubActivityFeedEventReader implements FeedEventReader {

    public readonly eventWindow: FeedEvent[] = [];

    /**
     * Read the GitHubActivityFeed
     * @return {Promise<void>}
     */
    public async readNewEvents(): Promise<FeedEvent[]> {
        // TODO how many events do you get
        const config = authHeaders(this.criteria.token);
        const url = `${this.criteria.scheme || "https://"}${this.criteria.apiBase || "api.github.com"}/${
            !!this.criteria.user ? "users" : "orgs"}/${this.criteria.owner}/events`;
        // TODO why do we need this cast?
        const r = await
        axios.get(url, config as any);
        const eventsRead = r.data as FeedEvent[];
        const newEvents = eventsRead.filter(
            e => !this.eventWindow.some(seen => seen.id === e.id),
        );
        return newEvents;
    }

    constructor(private readonly criteria: ScmFeedCriteria) {}
}
