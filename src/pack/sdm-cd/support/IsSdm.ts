import { predicatePushTest } from "@atomist/sdm";

/**
 * Is this repo an SDM?
 * @type {PredicatePushTest}
 */
export const IsSdm = predicatePushTest("IsSDM",
    async p => !!(await p.getFile("src/atomist.config.ts")));