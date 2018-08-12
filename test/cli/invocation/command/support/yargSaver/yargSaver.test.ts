/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

        const combined = subject.optimized(() => { /* whatever */ });

        assert(combined.helpMessages.some(line => line.includes("good job me")), "Help message was: " + combined.helpMessages.join("\n"))

    });
});
