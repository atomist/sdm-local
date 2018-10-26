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

import {
    GraphClient,
    logger,
    MutationOptions,
    QueryOptions,
} from "@atomist/automation-client";
import { eventStore } from "@atomist/automation-client/lib/globals";
import {
    PushForSdmGoal,
    SdmGoalsForCommit,
} from "@atomist/sdm";
import { SdmVersionForCommit } from "@atomist/sdm-core";

/**
 * Local graph client. Returns empty result set or throws an
 * exception on all calls. GraphQL is not presently supported in Local SDM.
 */
export class LocalGraphClient implements GraphClient {

    public endpoint: string;

    public executeMutation<T, Q>(mutation: string, variables?: Q, options?: any): Promise<T> {
        throw new Error();
    }

    public executeMutationFromFile<T, Q>(path: string, variables?: Q, options?: any, current?: string): Promise<T> {
        throw new Error();
    }

    public async executeQuery<T, Q>(query: string, variables?: Q, options?: any): Promise<T> {
        logger.warn("Returning empty object for query " + query);
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
        if (qo.name === "SdmGoalsForCommit" && qo.variables && qo.variables.offset === 0) {
            const v = qo.variables as SdmGoalsForCommit.Variables;
            const sha = v.sha;
            const goalSetId = v.goalSetId;
            const goals = eventStore().messages()
                .filter(m => m.value.sha === sha
                    && m.value.goalSet
                    && m.value.goalSetId
                    && !m.value.goals
                    && (!goalSetId || m.value.goalSetId === goalSetId))
                .map(m => m.value);
            return {
                SdmGoal: goals,
            } as any;
        } else if (qo.name === "PushForSdmGoal" && qo.variables) {
            const v = qo.variables as PushForSdmGoal.Variables;
            const sha = v.sha;
            const goal = eventStore().messages()
                .find(m => m.value.sha === sha && m.value.goalSet && m.value.goalSetId).value;
            return {
                Commit: [{
                    pushes: [goal.push],
                }],
            } as any;
        } else if (qo.name === "SdmVersionForCommit" && qo.variables && qo.variables.sha) {
            const v = qo.variables as SdmVersionForCommit.Variables;
            const sha = v.sha[0];
            const branch = v.branch[0];
            const version = eventStore().messages()
                .find(m => !m.value.goalSetId && m.value.sha === sha && m.value.version && m.value.branch === branch).value;
            return {
                SdmVersion: [{
                    version: version.version,
                }],
            } as any;
        } else if (!!qo.query && qo.query.trim().startsWith("query ChatTeam")) {
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
