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

import { portToListenOnFor } from "./portAllocation";
import { ClientType } from "../../common/parseCorrelationId";

/**
 * Create a correctly formatted correlation ID. We encode the port that
 * the automation client's message client can communicate back to us on over HTTP,
 * and the channel to use to display messages.
 * @return {string}
 */
export async function newCliCorrelationId(opts: {
    channel: string,
    encodeListenerPort?: boolean,
} = { channel: "general", encodeListenerPort: false}): Promise<string> {
    const encodedPort = opts.encodeListenerPort ? `${await portToListenOnFor(process.pid)}-` : "";
    const corrId = `${ClientType}-${encodedPort}${opts.channel || "general"}-${new Date().getTime()}`;
    return corrId;
}
