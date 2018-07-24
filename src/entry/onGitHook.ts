import { runOnGitHook } from "../invocation/git/runOnGitHook";
import { resolveConnectionConfig } from "./resolveConnectionConfig";

/*
    Called on git hook invocation
*/

// tslint:disable-next-line:no-floating-promises
runOnGitHook(process.argv, resolveConnectionConfig());
