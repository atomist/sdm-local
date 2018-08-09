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

import { CodeTransformRegistration } from "@atomist/sdm";
import { addDependencyTransform } from "./addDependencyTransform";
import { LoggingProgressLog } from "@atomist/sdm/api-helper/log/LoggingProgressLog";

/**
 * Transform to add local mode into a project
 */
export const AddLocalMode: CodeTransformRegistration<{ version: string }> = {
    ...addDependencyTransform({
        name: "@atomist/sdm-local",
        progressLog: new LoggingProgressLog("info")
    }) as any,
    name: "addLocalMode",
    intent: "add local mode",
};
