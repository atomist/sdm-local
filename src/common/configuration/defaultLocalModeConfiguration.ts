import { LocalModeConfiguration } from "@atomist/sdm-core";
import * as os from "os";
import * as path from "path";

export function defaultLocalLocalModeConfiguration(): LocalModeConfiguration {
    return {
        preferLocalSeeds: true,
        mergeAutofixes: true,
        useSystemNotifications: false,
        repositoryOwnerParentDirectory: determineDefaultRepositoryOwnerParentDirectory(),
    };
}

const DefaultAtomistRoot = "atomist";

export function determineDefaultRepositoryOwnerParentDirectory() {
    return process.env.ATOMIST_ROOT || path.join(os.homedir(), DefaultAtomistRoot);
}