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

import { GitHubActivityFeedEventReader } from "../../../../../../lib/cli/invocation/command/support/scm-feed/GitHubActivityFeedEventReader";
import { isPushEvent } from "../../../../../../lib/cli/invocation/command/support/scm-feed/FeedEvent";

describe("gitHubActivityFeed", () => {

    it("should connect to org", async () => {
        const reader = new GitHubActivityFeedEventReader({ owner: "spring-team", token: null});
        const events = await reader.readNewEvents();
        const pushEvents = events.filter(isPushEvent);
        process.stdout.write(`Events length is ${events.length}, push events=${pushEvents.length}`);
        process.stdout.write(JSON.stringify(pushEvents, null, 2));
    }).timeout(10000);

});
