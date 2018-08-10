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

import { infoMessage } from "../../../ui/consoleOutput";
import { verifyCommandResult } from "./verifyCommandResult";

/**
 * Verify that the correct version of the JDK is present
 * @return {Promise<void>}
 */
// TODO add version check
export async function verifyJDK() {
    await verifyCommandResult({
        command: "java -version",
        stdoutTest: verifyJavaTest(),
        onFailure: () => infoMessage("Please install Java\n"),
        onWrongVersion: () => infoMessage("Please update your Java version\n"),
    });
}

/**
 * Verify that the correct version of Maven is present
 * @return {Promise<void>}
 */
// TODO add version check
export async function verifyMaven() {
    await verifyCommandResult({
        command: "mvn --version",
        stdoutTest: stdout => true,
        onFailure: () => infoMessage("Please install Maven\n"),
        onWrongVersion: () => infoMessage("Please update your Maven version\n"),
    });
}

export function verifyJavaTest() {
    return (stdout: string) => true;
}

export function verifyMavenTest() {
    return (stdout: string) => true;
}
