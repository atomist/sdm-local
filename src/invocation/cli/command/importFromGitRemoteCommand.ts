import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { exec } from "child_process";
import * as fs from "fs";
import { promisify } from "util";
import { Argv } from "yargs";
import { addGitHooks } from "../../../setup/addGitHooks";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { logExceptionsToConsole } from "../support/consoleOutput";
import { sendChannelLinkEvent, sendRepoOnboardingEvent } from "../../../binding/repoOnboardingEvents";
import { infoMessage } from "../../..";

export function addImportFromGitRemoteCommand(ai: AutomationClientInfo, yargs: Argv) {
    yargs.command({
        command: "import <owner> <repo> [remoteBase]",
        aliases: "i",
        describe: "Import from Git remote. Remote base defaults to https://github.com",
        handler: argv => {
            return logExceptionsToConsole(async () => {
                const remoteBase = !!argv.base ? argv.base : "https://github.com";
                await importFromGitRemote(ai, argv.owner, argv.repo, remoteBase);
            }, ai.connectionConfig.showErrorStacks);
        },
    });
}

async function importFromGitRemote(ai: AutomationClientInfo,
                                   owner: string,
                                   repo: string,
                                   remoteBase: string): Promise<any> {
    infoMessage(`Importing Git remote project ${remoteBase}/${owner}/${repo}`);
    const orgDir = `${ai.localConfig.repositoryOwnerParentDirectory}/${owner}`;
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir);
    }
    await promisify(exec)(`git clone ${remoteBase}/${owner}/${repo}`,
        { cwd: orgDir });
    await addGitHooks(new GitHubRepoRef(owner, repo),
        `${orgDir}/${repo}`);
    await sendRepoOnboardingEvent(ai.connectionConfig, { owner, repo});
    await sendChannelLinkEvent(ai.connectionConfig, { owner, repo});
}
