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

import { NodeProjectCreationParameters } from "./NodeProjectCreationParameters";
import {
    Author,
    PackageJson,
} from "./PackageJson";
import {Project} from "@atomist/automation-client/lib/project/Project";
import {doWithJson} from "@atomist/automation-client/lib/project/util/jsonUtils";
import {logger} from "@atomist/automation-client/lib/util/logger";
import {CodeTransform} from "@atomist/sdm/lib/api/registration/CodeTransform";
import {execPromise} from "@atomist/sdm/lib/api-helper/misc/child_process";

/**
 * Code transform to update identification fields of package.json
 * @param project
 * @param context
 * @param params
 */
export const UpdatePackageJsonIdentification: CodeTransform<NodeProjectCreationParameters> =
    async (project, context, params) => {
        logger.info("Updating JSON: params=%j", params);
        const author: Author = {
            name: await fetchGitConfig("user.name", params.screenName),
            email: await fetchGitConfig("user.email", undefined),
        };
        return doWithJson<PackageJson, Project>(project, "package.json", pkg => {
            // context.configuration.te
            const repoUrl = params.target.repoRef.url;
            pkg.name = `@${params.target.repoRef.owner}/${params.target.repoRef.repo}`;
            pkg.description = params.target.description;
            pkg.version = params.version;
            pkg.author = author;
            pkg.repository = {
                type: "git",
                url: `${repoUrl}.git`,
            };
            pkg.homepage = `${repoUrl}#readme`;
            pkg.bugs = {
                url: `${repoUrl}/issues`,
            };
            pkg.keywords = pkg.keywords.filter(keyword => keyword !== "seed");
            logger.info("Updated JSON. Result is %j", pkg);
        });
    };

async function fetchGitConfig(property: string, defaultValue: string): Promise<string> {
    try {
        const result = await execPromise("git", ["config", property]);
        return result.stdout.trim();
    } catch {
        logger.info("Unable to retrieve git config " + property);
        return defaultValue;
    }
}
