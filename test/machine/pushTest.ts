import { logger } from "@atomist/automation-client";
import { DefaultReviewComment } from "@atomist/automation-client/operations/review/ReviewResult";
import { saveFromFiles } from "@atomist/automation-client/project/util/projectUtils";
import { AutofixGoal, AutofixRegistration, hasFileWithExtension, ReviewerRegistration, whenPushSatisfies } from "@atomist/sdm";
import { TypedFingerprint } from "@atomist/sdm/code/fingerprint/TypedFingerprint";
import { WellKnownGoals } from "@atomist/sdm/pack/well-known-goals/addWellKnownGoals";
import * as assert from "power-assert";
import { AddressChannelsFingerprintListener } from "../../src/invocation/cli/io/addressChannelsFingerprintListener";
import { RepositoryOwnerParentDirectory } from "../../src/invocation/machine";
import { loadConfiguration } from "../../src/machine/loadConfiguration";
import { LocalSoftwareDeliveryMachine } from "../../src/machine/LocalSoftwareDeliveryMachine";

describe("LocalSoftwareDeliveryMachine push", () => {

    it("should expose push reaction", async () => {
        const repoOwnerDirectory = RepositoryOwnerParentDirectory;
        const sdm = new LocalSoftwareDeliveryMachine(
            "name",
            loadConfiguration(repoOwnerDirectory),
            whenPushSatisfies(() => true).setGoals([
                AutofixGoal,
                // FingerprintGoal, ReviewGoal, PushReactionGoal
            ]))
            .addFingerprintListeners(AddressChannelsFingerprintListener)
            .addExtensionPacks(WellKnownGoals)
            .addFingerprinterRegistrations({
                name: "fp1",
                action: async pu => {
                    const fp = new TypedFingerprint("name", "NM", "0.1.0", {name: "tom"});
                    logger.info("Computed fingerprint %j", fp);
                    return fp;
                },
            })
            .addAutofixes(AddThingAutofix)
            .addReviewerRegistrations(HatesTheWorld)
            .addReviewListeners(async r => {
                logger.info("REVIEW: %j", r.review);
            })
            .addPushReactions(async p => p.addressChannels("Gotcha!"))
            .addPushReactions({
                name: "thing",
                pushTest: hasFileWithExtension("md"),
                action: async pu => {
                    const hasReadme = !!(await pu.project.getFile("README.md"));
                    return pu.addressChannels(`Project at ${pu.id.url} has readme=${hasReadme}`);
                },
            });
        assert.equal(sdm.pushReactionRegistrations.length, 2);

        await sdm.postCommit(
            `${sdm.configuration.repositoryOwnerParentDirectory}/spring-team/spring-rest-seed`,
            "master",
            "821af713301ac56a921b0d6014a2e2da08cb73ac");
    }).timeout(40000);

});

export const AddThingAutofix: AutofixRegistration = {
    name: "AddThing",
    action: async cri => {
        await cri.project.addFile("thing", "1");
        return {edited: true, success: true, target: cri.project};
    },
};

const HatesTheWorld: ReviewerRegistration = {
    name: "hatred",
    // pushTest: () => true,
    action: async cri => ({
        repoId: cri.project.id,
        comments: await saveFromFiles(cri.project, "**/*", f =>
            new DefaultReviewComment("info", "hater",
                `Found a file at \`${f.path}\`: We hate all files`,
                {
                    path: f.path,
                    lineFrom1: 1,
                    offset: -1,
                })),
    }),
    options: {considerOnlyChangedFiles: false},
};
