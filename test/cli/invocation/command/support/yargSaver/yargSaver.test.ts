import * as assert from "assert";
import { freshYargSaver, yargCommandFromSentence } from "../../../../../../src/cli/invocation/command/support/yargSaver/YargSaver";

describe("yarg saver", () => {

    it("errors when there are duplicates", () => {

        const subject = freshYargSaver();

        subject.withSubcommand(yargCommandFromSentence(
            {
                command: "show skills",
                handler: async () => "I am showing the skills",
                describe: "Command 1",
                parameters: [],
            },
        ));
        subject.withSubcommand(yargCommandFromSentence(
            {
                command: "show skills",
                handler: async () => "I am showing the mad skillz",
                describe: "Command 2",
                parameters: [],
            },
        ));

        assert.throws(() => {
            subject.optimized(() => { /* whatever */ });
        });

    });

    it("drops a polite duplicate", () => {

        const subject = freshYargSaver();

        subject.withSubcommand(yargCommandFromSentence(
            {
                command: "show skills",
                handler: async () => "I am showing the skills",
                describe: "Command 1",
                parameters: [],
            },
        ));
        subject.withSubcommand(yargCommandFromSentence(
            {
                command: "show skills",
                handler: async () => "I am showing the mad skillz",
                describe: "Command 2",
                parameters: [],
                conflictResolution: { failEverything: false, commandDescription: "good job me" },
            },
        ));

        subject.optimized(() => { /* whatever */ });

    });
});
