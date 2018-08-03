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

const ClientType = "atomist-cli";

/**
 * Create a correctly formatted correlation ID. We encode the port that
 * the automation client's message client can communicate back to us on over HTTP,
 * and the channel to use to display messages.
 * @return {string}
 */
export async function newCorrelationId(opts: {
    channel: string,
    encodeListenerPort?: boolean,
} = { channel: "general", encodeListenerPort: false}): Promise<string> {
    const encodedPort = opts.encodeListenerPort ? `${await portToListenOnFor(process.pid)}-` : "";
    const corrId = `${ClientType}-${encodedPort}${opts.channel || "general"}-${new Date().getTime()}`;
    return corrId;
}

/**
 * Return the port to respond to this on
 * @param {string} correlationId
 * @return {number | undefined}
 */
export function portToRespondOn(correlationId: string): number | undefined {
    const pattern = new RegExp(`^${ClientType}\-([^\-]+)\-`);
    const id = correlationId.match(pattern)[1];
    return !!id ? parseInt(id, 10) : undefined;
}

export function channelFor(correlationId: string): string {
    const pattern = new RegExp(`^${ClientType}\-[^\-]+\-([^\-]+)`);
    process.stdout.write(`corrid='${correlationId}'`);
    const channel = correlationId.match(pattern)[1];
    return channel;
}

const LowerPort = 10000;

const portfinder = require("portfinder");

// Keep track of ports we've used
const pidToPort: { [index: number]: number} = [];

/**
 * Return the port to listen on for this process id
 * @param {number} pid
 * @return {number}
 */
export async function portToListenOnFor(pid: number): Promise<number> {
    const foundPort = pidToPort[pid];
    if (foundPort !== undefined) {
        return foundPort;
    }
    const port = await portfinder.getPortPromise({/*host: this.options.baseUrl,*/ port: LowerPort});
    pidToPort[pid] = port;
    return port;
}
