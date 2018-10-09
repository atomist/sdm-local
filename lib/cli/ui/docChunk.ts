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
import * as fs from "fs-extra";
import * as marked from "marked";
import * as TerminalRenderer from "marked-terminal";
import * as path from "path";

marked.setOptions({
    // Define custom renderer
    renderer: new TerminalRenderer(),
});

/**
 * Render a documentation chunk from the base of this project
 * @param {string} relativePath
 * @return {string}
 */
export function renderProjectDocChunk(relativePath: string): string | undefined {
    const location = path.join(__dirname, "../../..", relativePath);
    return renderDocChunk(location);
}

export function renderDocChunk(location: string): string | undefined {
    try {
        const chunk = fs.readFileSync(location).toString();
        return marked(chunk).trim();
    } catch (e) {
        logger.warn("Error reading doc file at %s : %s", location, e.message);
        return "Failed to resolve doc chunk at " + location;
    }
}
