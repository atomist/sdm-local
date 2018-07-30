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
    config,
    gitInfo,
    gqlFetch,
    gqlGen,
    kube,
    start,
} from "./support/commands";
import { errorMessage } from "./support/consoleOutput";
import * as yargs from "yargs";

const Package = "atomist";

const compileDescribe = "Run 'npm run compile' before running";
const installDescribe = "Run 'npm install' before running/compiling, default is to install if no " +
    "'node_modules' directory exists";

export function addClientCommands(yargs: yargs.Argv) {
    addStartCommand(yargs);
    addGqlFetchCommand(yargs);
    addGqlGenCommand(yargs);
    addGitInfoCommand(yargs);
    addConfigCommand(yargs);
    addKubeCommand(yargs);
}

function addStartCommand(yargs: yargs.Argv) {
    yargs.command(["start", "st", "run"], "Start an SDM or automation client", ya => {
        return ya
            .option("change-dir", {
                alias: "C",
                default: process.cwd(),
                describe: "Path to automation client project",
                type: "string",
            })
            .option("compile", {
                default: true,
                describe: compileDescribe,
                type: "boolean",
            })
            .option("local", {
                default: false,
                describe: "Start in local mode",
                type: "boolean",
            })
            .option("install", {
                describe: installDescribe,
                type: "boolean",
            });
    }, argv => {
        try {
            const status = start(argv["change-dir"], argv.install, argv.compile, argv.local);
            process.exit(status);
        } catch (e) {
            errorMessage(`${Package}: Unhandled Error: ${e.message}`);
            process.exit(101);
        }
    });
}

function addGqlFetchCommand(yargs: yargs.Argv) {
    yargs.command(["gql-fetch <workspace-id>"], "Introspect GraphQL schema", ya => {
        return (ya)
            .positional("workspace-id", {
                describe: "Atomist workspace/team ID",
            })
            .option("token", {
                alias: "T",
                describe: "Token to use for authentication",
                default: process.env.ATOMIST_TOKEN || process.env.GITHUB_TOKEN,
                type: "string",
            })
            .option("change-dir", {
                alias: "C",
                default: process.cwd(),
                describe: "Path to automation client project",
                type: "string",
            })
            .option("install", {
                describe: installDescribe,
                type: "boolean",
            });
    }, argv => {
        gqlFetch(argv["change-dir"], argv["workspace-id"], argv.token, argv.install)
            .then(status => process.exit(status), err => {
                errorMessage(`${Package}: Unhandled Error: ${err.message}`);
                process.exit(101);
            });
    });
}

function addGqlGenCommand(yargs: yargs.Argv) {
    yargs.command(["gql-gen <glob>", "gql <glob>"], "Generate TypeScript code for GraphQL", ya => {
        return ya
            .option("change-dir", {
                alias: "C",
                default: process.cwd(),
                describe: "Path to automation client project",
                type: "string",
            })
            .option("install", {
                describe: installDescribe,
                type: "boolean",
            });
    }, argv => {
        gqlGen(argv["change-dir"], argv.glob, argv.install)
            .then(status => process.exit(status), err => {
                errorMessage(`${Package}: Unhandled Error: ${err.message}`);
                process.exit(101);
            });
    });
}

function addGitInfoCommand(yargs: yargs.Argv) {
    yargs.command("git", "Create a git-info.json file", ya => {
        return ya
            .option("change-dir", {
                alias: "C",
                describe: "Path to automation client project",
                default: process.cwd(),
            });
    }, argv => {
        gitInfo(argv)
            .then(status => process.exit(status), err => {
                errorMessage(`${Package}: Unhandled Error: ${err.message}`);
                process.exit(101);
            });
    });
}

function addConfigCommand(yargs: yargs.Argv) {
    yargs.command("config", "Configure environment for running automation clients", ya => {
        return ya
            .option("atomist-token", {
                describe: "GitHub personal access token",
                type: "string",
            })
            .option("github-user", {
                describe: "GitHub user login",
                type: "string",
            })
            .option("github-password", {
                describe: "GitHub user password",
                type: "string",
            })
            .option("github-mfa-token", {
                describe: "GitHub user password",
                type: "string",
            })
            .option("workspace-id", {
                describe: "Atomist workspace/team ID",
                type: "string",
            });
    }, argv => {
        config(argv)
            .then(status => process.exit(status), err => {
                errorMessage(`${Package}: Unhandled Error: ${err.message}`);
                process.exit(101);
            });
    });
}

function addKubeCommand(yargs: yargs.Argv) {
    yargs.command("kube", "Deploy Atomist Kubernetes utilities to your Kubernetes cluster", ya => {
        return ya
            .option("environment", {
                describe: "Informative name for yout Kubernetes cluster",
                type: "string",
            })
            .option("namespace", {
                describe: "Deploy utilities in namespace mode",
                type: "string",
            });
    }, argv => {
        kube(argv)
            .then(status => process.exit(status), err => {
                errorMessage(`${Package}: Unhandled Error: ${err.message}`);
                process.exit(101);
            });
    });
}

