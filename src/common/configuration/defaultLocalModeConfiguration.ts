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
import { LocalModeConfiguration } from "@atomist/sdm-core";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

export function defaultLocalLocalModeConfiguration(): LocalModeConfiguration {
    return {
        preferLocalSeeds: true,
        mergeAutofixes: true,
        repositoryOwnerParentDirectory: determineDefaultRepositoryOwnerParentDirectory(),
    };
}

const DefaultAtomistRoot = "atomist";

export function determineDefaultRepositoryOwnerParentDirectory() {
    const root = process.env.ATOMIST_ROOT || path.join(os.homedir(), DefaultAtomistRoot);
    if (!fs.existsSync(root)) {
        logger.info(`Creating Atomist repository owner directory at '${root}'`);
        fs.mkdirSync(root, "0744");
    }
    return root;
}
