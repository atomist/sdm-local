import { GitHubRepoRef } from "@atomist/automation-client/operations/common/GitHubRepoRef";
import { execSync } from "child_process";
import * as fs from "fs";
import { Argv } from "yargs";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { addGitHooks } from "../../../setup/addGitHooks";
import { logExceptionsToConsole, writeToConsole } from "../support/consoleOutput";

export function addImportFromGitRemoteCommand(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "import <owner> <repo> [remote base, default https://github.com]",
        describe: "Import from Git remote",
        handler: argv => {
            return logExceptionsToConsole(async () => {
                const remoteBase = !!argv.base ? argv.base : "https://github.com";
                await importFromGitRemote(sdm, argv.owner, argv.repo, remoteBase);
            });
        },
    });
}

async function importFromGitRemote(sdm: LocalSoftwareDeliveryMachine,
                                   org: string,
                                   repo: string,
                                   remoteBase: string): Promise<any> {
    writeToConsole(`Importing Git remote project ${remoteBase}/${org}/${repo}`);
    const orgDir = `${sdm.configuration.repositoryOwnerParentDirectory}/${org}`;
    if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir);
    }
    execSync(`git clone ${remoteBase}/${org}/${repo}`,
        { cwd: orgDir });
    return addGitHooks(new GitHubRepoRef(org, repo),
        `${orgDir}/${repo}`);
}
