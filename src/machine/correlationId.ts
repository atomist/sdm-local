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



const ClientType = "slalom";

/**
 * Create a correctly formatted correlation ID. We encode the port that
 * the automation client's message client can communicate back to us on over HTTP,
 * and the channel to use to display messages.
 * @return {string}
 */
export function newCorrelationId(channel: string = "general"): string {
    return `${ClientType}-${pidToPort(process.pid)}-${channel}-${new Date().getTime()}`;
}

export function clientIdentifier(correlationId: string): number {
    const pattern = new RegExp(`^${ClientType}\-([^\-]+)\-`);
    const id = correlationId.match(pattern)[1];
    return parseInt(id, 10);
}

export function channelFor(correlationId: string): string {
    const pattern = new RegExp(`^${ClientType}\-[^\-]+\-([^\-]+)`);
    const channel = correlationId.match(pattern)[1];
    return channel;
}

export function pidToPort(pid: number): number {
    return pid % 55536 + 10000;
}
