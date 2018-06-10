import { logger, Parameter } from "@atomist/automation-client";
import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import {
    FingerprintGoal, GenericGoal, GoalWithPrecondition,
    hasFileWithExtension, IndependentOfEnvironment,
    PushReactionGoal,
    ReviewGoal,
    SeedDrivenGeneratorParametersSupport,
    SoftwareDeliveryMachine,
    whenPushSatisfies,
} from "@atomist/sdm";
import { TypedFingerprint } from "@atomist/sdm/code/fingerprint/TypedFingerprint";
import { WellKnownGoals } from "@atomist/sdm/pack/well-known-goals/addWellKnownGoals";
import { AddressChannelsFingerprintListener } from "./invocation/cli/io/addressChannelsFingerprintListener";

export const RunLastGoal = new GoalWithPrecondition({
    uniqueName: "RunLast",
    environment: IndependentOfEnvironment,
    orderedName: "4-tag",
    displayName: "tag",
    workingDescription: "Running last...",
    completedDescription: "Ran last",
    failedDescription: "Failed to create Tag",
}, FingerprintGoal);

/**
 * User-specific code
 * @param {} sdm
 */
export function configure(sdm: SoftwareDeliveryMachine) {
    sdm.addGoalContributions(
        whenPushSatisfies(() => true).setGoals([
            FingerprintGoal, PushReactionGoal, ReviewGoal,
            RunLastGoal,
        ]));
    sdm
        .addGoalImplementation("foo", RunLastGoal,
            async rwlc => {
                console.log("Running last");
                return null;
            },
        )
        .addFingerprintListeners(AddressChannelsFingerprintListener)
        .addExtensionPacks(WellKnownGoals)
        .addFingerprinterRegistrations({
            name: "fp1",
            action: async pu => {
                const fp = new TypedFingerprint("name", "NM", "0.1.0", { name: "tom" });
                logger.info("Computed fingerprint %j", fp);
                return fp;
            },
        })
        .addPushReactions(async p => p.addressChannels("Gotcha!"))
        .addPushReactions({
            name: "thing",
            pushTest: hasFileWithExtension("md"),
            action: async pu => {
                const hasReadme = !!(await pu.project.getFile("README.md"));
                return pu.addressChannels(`Project at ${pu.id.url} has README=${hasReadme}`);
            },
        })
        .addGenerators({
            name: "foo",
            editor: async p => p.addFile("local", "stuff"),
            paramsMaker: () => new MyParameters({
                seed: new GitHubRepoRef("spring-team", "spring-rest-seed"),
            }),
        })
        .addEditors({
            name: "addThing",
            editor: async p => p.addFile("thing", "1"),
        })
        .addCommands({
            name: "hello",
            listener: async ci => ci.addressChannels("Hello world!"),
        });
}

class MyParameters extends SeedDrivenGeneratorParametersSupport {

    @Parameter()
    public grommit;
}
