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

import { predicatePushTest, PushTest } from "@atomist/sdm";
import { isFileSystemRemoteRepoRef } from "../binding/project/FileSystemRemoteRepoRef";
import { isInLocalMode } from "./isInLocalMode";

/**
 * Is this a local project?
 * @type {PredicatePushTest}
 */
export const PushTests: PushTest = predicatePushTest("IsLocal",
    async p => isFileSystemRemoteRepoRef(p.id));

/**
 * Is this SDM running in local mode?
 */
export const IsInLocalMode: PushTest = {
    name: "IsInLocalMode",
    mapping: async () => isInLocalMode(),
};
