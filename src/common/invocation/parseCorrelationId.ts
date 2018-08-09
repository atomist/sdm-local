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

export const ClientType = "atomist-cli";

/**
 * Parse correlation id produced by newCorrelationId.
 * Return the port to respond on.
 * @param {string} correlationId
 * @return {number | undefined}
 */
export function parsePort(correlationId: string): number | undefined {
    const pattern = new RegExp(`^${ClientType}\-([^\-]+)\-`);
    const id = correlationId.match(pattern)[1];
    return !!id ? parseInt(id, 10) : undefined;
}

/**
 * Parse correlation id produced by newCorrelationId.
 * Return the channel to respond on
 * @param {string} correlationId
 * @return {string}
 */
export function parseChannel(correlationId: string): string {
    const pattern = new RegExp(`^${ClientType}\-[^\-]+\-([^\-]+)`);
    const channel = correlationId.match(pattern)[1];
    return channel;
}
