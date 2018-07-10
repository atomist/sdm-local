import { logger, Parameter, Parameters } from "@atomist/automation-client";
import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { buttonForCommand } from "@atomist/automation-client/spi/message/MessageClient";
import {
    AutofixGoal,
    FingerprintGoal, GoalWithPrecondition,
    hasFileWithExtension, IndependentOfEnvironment,
    PushReactionGoal,
    ReviewGoal,
    SeedDrivenGeneratorParametersSupport,
    SoftwareDeliveryMachine,
    whenPushSatisfies,
} from "@atomist/sdm";
import { WellKnownGoals } from "@atomist/sdm-core";
import { TypedFingerprint } from "@atomist/sdm/api-helper/code/fingerprint/TypedFingerprint";
import * as slack from "@atomist/slack-messages/SlackMessages";
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
            AutofixGoal,
            FingerprintGoal, PushReactionGoal, ReviewGoal,
            RunLastGoal,
        ]));
    sdm
        .addGoalImplementation("foo", RunLastGoal,
            async rwlc => {
                return rwlc.addressChannels("Running last");
            },
        )
        .addAutofix({
            name: "ensureHasThing2",
            transform: async p => {
                await p.addFile("thing2", "2");
                return { edited: true, success: true, target: p };
            },
        })
        .addFingerprintListener(AddressChannelsFingerprintListener)
        .addExtensionPacks(WellKnownGoals)
        .addFingerprinterRegistration({
            name: "fp1",
            action: async pu => {
                const fp = new TypedFingerprint("name", "NM", "0.1.0", { name: "tom" });
                logger.info("Computed fingerprint %j", fp);
                return fp;
            },
        })
        .addPushReaction(async p => p.addressChannels("Gotcha!"))
        .addPushReaction({
            name: "thing",
            pushTest: hasFileWithExtension("md"),
            action: async pu => {
                const hasReadme = !!(await pu.project.getFile("README.md"));
                return pu.addressChannels(`Project at ${pu.id.url} has README=${hasReadme}`);
            },
        })
        .addGeneratorCommand({
            name: "foo",
            transform: async p => p.addFile("local", "stuff"),
            paramsMaker: () => new MyParameters({
                seed: () =>  new GitHubRepoRef("spring-team", "spring-rest-seed"),
            }),
        })
        .addCodeTransformCommand({
            name: "addThing",
            transform: async p => p.addFile("thing", "1"),
        })
        .addCommand({
            name: "hello",
            paramsMaker: HelloParameters,
            listener: async ci => ci.addressChannels(
                !!ci.parameters.name ? `Hello _${ci.parameters.name}_` : "Hello world!",
            ),
        })
        .addCommand({
            name: "button",
            listener: async inv => {
                const attachment: slack.Attachment = {
                    text: "Greeting?",
                    fallback: "show greeting",
                    actions: [buttonForCommand({ text: "Say hello" },
                        "hello",
                        { name: "Rod" },
                    ),
                    ],
                };
                const message: slack.SlackMessage = {
                    attachments: [attachment],
                };
                return inv.addressChannels(message);
            },
        });
}

class MyParameters extends SeedDrivenGeneratorParametersSupport {

    @Parameter()
    public grommit;
}

@Parameters()
class HelloParameters {

    @Parameter({ required: false })
    public name;
}
