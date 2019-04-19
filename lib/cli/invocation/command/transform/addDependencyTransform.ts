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

import {
    CodeTransformRegistration,
    ProgressLog,
    spawnCodeTransform,
} from "@atomist/sdm";

export interface ModuleId {
    name?: string;
    version: string;
}

/**
 * Transform to add a module to a project. Uses npm install.
 * @param opts dependency info. If not supplied, parameters will be used
 */
export function addDependencyTransform(opts: Partial<ModuleId> & {
    progressLog?: ProgressLog,
}): Partial<CodeTransformRegistration<ModuleId>> {
    return {
        parameters: {
            name: {
                required: !opts.name,
                description: "module name",
            },
            version: {
                required: false,
                description: "npm version qualification. Goes after module name, e.g. @branch-master",
                defaultValue: opts.version || "",
            },
        },
        transform: async (p, cli) => {
            return spawnCodeTransform([{
                command: "npm",
                args: ["install",
                    `${cli.parameters.name || opts.name}${cli.parameters.version}`],
            }], opts.progressLog)(p, cli);
        },
    };
}
