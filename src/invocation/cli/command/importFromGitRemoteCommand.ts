import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { execSync } from "child_process";
import * as fs from "fs";
import { Argv } from "yargs";
import { addGitHooks } from "../../../setup/addGitHooks";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import { logExceptionsToConsole } from "../support/consoleOutput";

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
                                   org: string,
                                   repo: string,
                                   remoteBase: string): Promise<any> {
    process.stdout.write(`Importing Git remote project ${remoteBase}/${org}/${repo}`);
    const orgDir = `${ai.localConfig.repositoryOwnerParentDirectory}/${org}`;
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir);
    }
    execSync(`git clone ${remoteBase}/${org}/${repo}`,
        { cwd: orgDir });
    return addGitHooks(new GitHubRepoRef(org, repo),
        `${orgDir}/${repo}`,
        ai.localConfig.gitHookScript);
}
