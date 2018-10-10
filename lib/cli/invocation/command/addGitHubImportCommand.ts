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

import { GitHubDotComBase } from "@atomist/automation-client/lib/operations/common/GitHubRepoRef";
import axios, { AxiosRequestConfig } from "axios";
import { WorkspaceContextResolver } from "../../../common/binding/WorkspaceContextResolver";
import { LocalWorkspaceContext } from "../../../common/invocation/LocalWorkspaceContext";
import { determineDefaultRepositoryOwnerParentDirectory } from "../../../sdm/configuration/defaultLocalSoftwareDeliveryMachineConfiguration";
import { AutomationClientInfo } from "../../AutomationClientInfo";
import {
    infoMessage,
    logExceptionsToConsole,
    warningMessage,
} from "../../ui/consoleOutput";
import { cloneAndAtomize } from "./support/cloneAndAtomize";
import { YargBuilder } from "./support/yargBuilder";

/**
 * Import an org from github
 * @param {AutomationClientInfo[]} clients
 * @param {YargBuilder} yargs
 * @param workspaceContextResolver
 */
export function addGitHubImportCommand(clients: AutomationClientInfo[],
                                       yargs: YargBuilder,
                                       workspaceContextResolver: WorkspaceContextResolver) {
    yargs.command({
        command: "import github <org> [githubBase]",
        describe: "Clone all accessible repos under a github org " +
        `under the Atomist root at ${determineDefaultRepositoryOwnerParentDirectory()}`,
        handler: argv => {
            const githubBase = argv.githubBase || GitHubDotComBase;
            return logExceptionsToConsole(async () => {
                await cloneAllInOrg(clients,
                    githubBase,
                    argv.org,
                    workspaceContextResolver.workspaceContext);
            }, true);
        },
    });
}

async function cloneAllInOrg(clients: AutomationClientInfo[],
                             githubBase: string,
                             owner: string,
                             workspaceContext: LocalWorkspaceContext): Promise<any> {
    const repositoryOwnerDirectory = determineDefaultRepositoryOwnerParentDirectory();
    // Find all accessible repos
    const repos = (await findAllRepos(githubBase, owner))
        .map((repo: any) => repo.name);
    infoMessage("Found %d repos\n", repos.length);

    return Promise.all(
        repos.map(repo => cloneAndAtomize({
            repositoryOwnerDirectory,
            owner,
            repo,
            cloneCommand: `git clone ${githubBase.replace("api.", "")}/${owner}/${repo}`,
            clients,
            workspaceContext,
        }).catch(err => {
            warningMessage("Unable to clone %s/%s/ - \n\t%s\n", githubBase, owner, repo, err.messageClient);
        })),
    );
}

async function findAllRepos(githubBase: string, owner: string): Promise<any[]> {
    // Try user first, then org
    return findAllReposFor(githubBase, owner, true)
        .catch(err => findAllReposFor(githubBase, owner, false));
}

async function findAllReposFor(githubBase: string, owner: string, user: boolean): Promise<any[]> {
    const url = `${githubBase}/${user ? "users" : "orgs"}/${owner}/repos?per_page=1000`;
    infoMessage("Querying for repos at %s\n", url);

    const token = process.env.GITHUB_TOKEN;
    return (await axios.get(url, authHeaders(token))).data;
}

function authHeaders(token: string): AxiosRequestConfig {
    return token ? {
            headers: {
                Authorization: `token ${token}`,
            },
        }
        : {};
}
