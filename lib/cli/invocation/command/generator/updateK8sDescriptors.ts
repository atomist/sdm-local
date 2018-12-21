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
    projectUtils,
} from "@atomist/automation-client";
import {
    CodeTransform,
} from "@atomist/sdm";
import { NodeProjectCreationParameters } from "./NodeProjectCreationParameters";

/**
 * Code transform to update identification fields of package.json
 * @param project
 * @param context
 * @param params
 */
export const UpdateSeedK8SDescriptor: CodeTransform<NodeProjectCreationParameters> =
    async (project, context, params) => {
        return projectUtils.doWithFiles(project, "assets/kubectl/sdm.yaml", async yaml => {
            const content = await yaml.getContent();
            content.replace("atomist/seed-sdm:0.1.0", `${params.target.repoRef.owner}/${params.target.repoRef.repo}:${params.version}`);
            content.replace("seed-sdm", params.target.repoRef.repo);
            await yaml.setContent(content);
            return project;
        });
    };
