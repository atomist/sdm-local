import { runOnGitHook } from "../invocation/git/runOnGitHook";
import { resolveConnectionConfig } from "./resolveConnectionConfig";

/*
    Called on git hook invocation
 */

runOnGitHook(process.argv, resolveConnectionConfig());
