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
import {
    freshYargBuilder,
    yargCommandFromSentence
} from "../../../../../../src/cli/invocation/command/support/yargBuilder";

describe("yarg saver", () => {

    it("errors when there are duplicates", () => {

        const subject = freshYargBuilder();

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
            subject.build();
        });

    });

    it("drops a polite duplicate", () => {

        const subject = freshYargBuilder();

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

        const combined = subject.build();

        const result = (combined as any).helpMessages;

        assert(result.some((line: string) =>
            line.includes("good job me")), "Help message was: " + result.join("\n"))

    });
});