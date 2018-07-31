import { predicatePushTest, PushTest } from "@atomist/sdm";
import { isFileSystemRemoteRepoRef } from "../binding/project/FileSystemRemoteRepoRef";

/**
 * Are we running locally, on a local project?
 * @type {PredicatePushTest}
 */
export const IsLocal: PushTest = predicatePushTest("IsLocal",
    async p => isFileSystemRemoteRepoRef(p.id));