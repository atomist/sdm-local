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

import * as asyncPolling from "async-polling";

/**
 * Watch this indefinitely
 * @param {() => Promise<void>} f
 * @param {number} intervalMillis
 * @return {Promise<void>}
 */
export async function doForever(f: () => Promise<void>, intervalMillis: number) {
    const polling = asyncPolling(async () => {
        // We never finish
        await f();
    }, intervalMillis);

    polling.on("error", (error: Error) => {
        // The polling encountered an error, handle it here.
    });
    // We never complete so don't need to react to this
    polling.run();
}
