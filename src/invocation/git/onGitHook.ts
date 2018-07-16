import { localSdmInstance } from "../machineLoader";
import { runOnGitHook } from "./runOnGitHook";

runOnGitHook(process.argv, localSdmInstance);
