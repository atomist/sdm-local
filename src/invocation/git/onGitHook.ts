import { runOnGitHook } from "./runOnGitHook";
import { localSdmInstance } from "../machineLoader";

runOnGitHook(process.argv, localSdmInstance);