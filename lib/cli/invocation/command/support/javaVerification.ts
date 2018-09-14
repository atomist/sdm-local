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

import {
    Integer,
    Microgrammar,
} from "@atomist/microgrammar";
import { infoMessage } from "../../../ui/consoleOutput";
import {
    CommandResult,
    verifyCommandResult,
} from "./verifyCommandResult";

/**
 * Verify that the correct version of the JDK is present
 * @return {Promise<void>}
 */
export async function verifyJDK() {
    await verifyCommandResult({
        command: "java -version",
        outputTest: verifyJavaTest,
        onFailure: () => infoMessage("Please install Java\n"),
        onWrongVersion: () => infoMessage("Java 8 or above is required\n"),
    });
}

/**
 * Verify that the correct version of Maven is present
 * @return {Promise<void>}
 */
export async function verifyMaven() {
    await verifyCommandResult({
        command: "mvn --version",
        outputTest: verifyMavenTest,
        onFailure: () => infoMessage("Please install Maven\n"),
        onWrongVersion: () => infoMessage("Please update your Maven version\n"),
    });
}

/**
 * The Java version string format keeps changing -
 * https://www.journaldev.com/20930/check-java-version
 * @param {CommandResult} r
 * @return {boolean}
 */
export function verifyJavaTest(r: CommandResult) {
    if (!r.stdout) {
        return false;
    }
    let parsed = ThreePointJavaVersionGrammar.firstMatch(r.stdout);
    if (!parsed) {
        parsed = OnePointJavaVersionGrammar.firstMatch(r.stdout);
    }
    if (!parsed) {
        return false;
    }
    return parsed.major >= 9 || (parsed.major === 1 && parsed.minor >= 8);
}

const ThreePointJavaVersionGrammar = Microgrammar.fromString<{major: number, minor?: number, b1?: number}>(
    "java version \"${major}.${minor}.${b1}",
    {
        major: Integer,
        minor: Integer,
        b1: Integer,
    },
);

// Java version output changed in 9, so this is valid
const OnePointJavaVersionGrammar = Microgrammar.fromString<{major: number}>(
    "java version \"${major}",
    {
        major: Integer,
    },
);

export function verifyMavenTest(r: CommandResult) {
    if (!r.stdout) {
        return false;
    }
    const parsed = MavenVersionGrammar.firstMatch(r.stdout);
    return !!parsed && parsed.major >= 3;
}

const MavenVersionGrammar = Microgrammar.fromString<{major: number, minor: number, point: number}>(
    "Apache Maven ${major}.${minor}.${point}",
    {
        major: Integer,
        minor: Integer,
        point: Integer,
    },
);
