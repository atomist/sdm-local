import { verifyCommandResult } from "./verifyCommandResult";
import { infoMessage } from "../../../ui/consoleOutput";

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
