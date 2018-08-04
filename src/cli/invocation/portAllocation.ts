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

const LowerPort = 10000;

const portfinder = require("portfinder");

// Keep track of ports we've used
const pidToPort: { [index: number]: number } = [];

/**
 * Return the port to listen on for this process id.
 * Keep track of ports we've used
 * @param {number} pid
 * @return {number}
 */
export async function portToListenOnFor(pid: number): Promise<number> {
    const foundPort = pidToPort[pid];
    if (foundPort !== undefined) {
        return foundPort;
    }
    const port = await portfinder.getPortPromise({ /*host: this.options.baseUrl,*/ port: LowerPort });
    pidToPort[pid] = port;
    return port;
}
