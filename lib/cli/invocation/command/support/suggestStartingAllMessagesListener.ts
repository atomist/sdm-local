/*
 * Copyright © 2019 Atomist, Inc.
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

import { isFeedListenerRunning } from "../../../../sdm/ui/HttpMessageListener";
import { adviceDoc } from "../../../ui/consoleOutput";

/**
 * Display a message to the console suggesting starting the listener
 * @return {Promise<void>}
 */
export async function suggestStartingAllMessagesListener(): Promise<void> {
    const running = await isFeedListenerRunning();
    if (!running) {
        adviceDoc("docs/startListener.md");
    }
}
