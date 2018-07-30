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

import { logger } from "@atomist/automation-client";
import {
    GraphClient,
    MutationOptions,
    QueryOptions,
} from "@atomist/automation-client/spi/graph/GraphClient";
import { errorMessage } from "../../invocation/cli/command/support/consoleOutput";

/**
 * Local graph client. Returns empty result set or throws an
 * exception on all calls. GraphQL is not presently supported in Slalom.
 */
export class LocalGraphClient implements GraphClient {

    public endpoint: string;

    public executeMutation<T, Q>(mutation: string, variables?: Q, options?: any): Promise<any> {
        throw new Error();
    }

    public executeMutationFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T> {
        throw new Error();
    }

    public async executeQuery<T, Q>(query: string, variables?: Q, options?: any): Promise<T> {
        errorMessage("Returning empty object for query " + query);
        return {} as T;
    }

    public executeQueryFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T> {
        throw new Error();
    }

    public mutate<T, Q>(optionsOrName: MutationOptions<Q> | string): Promise<T> {
        throw new Error();
    }

    public async query<T, Q>(optionsOrName: QueryOptions<Q> | string): Promise<T> {
        // TODO we are hard coding this to ensure that a particular query coming from automation-client is satisfied.
        // How do we do this in a better, more extensible way?
        const qo = optionsOrName as QueryOptions<any>;
        if (!!qo.query && qo.query.trim().startsWith("query ChatTeam")) {
            const ctr = {
                ChatTeam: [{
                    id: "any",
                }],
            };
            logger.info("Returning hardcoded ChatTeam %j", ctr);
            return ctr as any;
        }

        const err = new Error("Warning: GraphClient not supported locally");
        if (this.showErrorStacks) {
            logger.info("Returning empty object for query: %j, %s", optionsOrName, err.stack);
        }
        return {} as T;
    }

    constructor(private readonly showErrorStacks: boolean) {
    }

}
