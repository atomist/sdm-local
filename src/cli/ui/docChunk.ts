import * as marked from "marked";
import * as TerminalRenderer from "marked-terminal";
import * as fs from "fs-extra";

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
export function renderProjectDocChunk(relativePath: string): string {
    const location = path.join(__dirname, "../../..", relativePath);
    return renderDocChunk(location);
}

export function renderDocChunk(location: string): string {
    const chunk = fs.readFileSync(location).toString();
    return marked(chunk);
}