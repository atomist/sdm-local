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

import { Arg } from "@atomist/automation-client";

/**
 * Read the properties of the given object and convert them to the
 * Arg type used in the automation-client API.
 * @param o object
 */
export function propertiesToArgs(o: any): Arg[] {
    if (Array.isArray(o)) {
        return o;
    }
    const args = Object.keys(o).map(k => ({ name: k, value: o[k] }));
    return args;
}
