import { runOnGitHook } from "../invocation/git/runOnGitHook";
import { resolveConnectionConfig } from "./resolveConnectionConfig";

runOnGitHook(process.argv, resolveConnectionConfig());
