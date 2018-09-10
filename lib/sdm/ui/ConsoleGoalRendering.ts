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
    SdmGoalEvent,
    SdmGoalState,
} from "@atomist/sdm";
import chalk from "chalk";
import * as formatDate from "format-date";
import * as _ from "lodash";
import * as marked from "marked";
import * as TerminalRenderer from "marked-terminal";
import Signals = NodeJS.Signals;
import strip_ansi = require("strip-ansi");
import {
    init,
    ProgressBar,
} from "../../../bin/progressBar";
import { infoMessage } from "../../cli/ui/consoleOutput";

marked.setOptions({
    // Define custom renderer
    renderer: new TerminalRenderer(),
});

// tslint:disable-next-line:no-var-requires
const term = require("terminal-kit").terminal;

term.options.crlf = true;

const SchemaRequested = ":spinner :icon :name :bar :description :link";
const SchemaSuccess = "  :icon :name :bar :description :link";
const Frames = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏",
];

export class ConsoleGoalRendering {

    private readonly goalSets: GoalSet[] = [];
    private readonly unkownGoals: SdmGoalEvent[] = [];

    constructor() {
        term.windowTitle("Atomist - SDM Goals");

        [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(eventType => {
            process.on(eventType as Signals, () => {
                term.hideCursor(false);
                process.exit(0);
            });
        });

        term.getCursorLocation((cb: any, x: number, y: number) => {
            infoMessage("Listening for SDM goals...");
            term.moveTo(x, y);
            init({ row: y, col: x });
            term.hideCursor();

            setInterval(() => {
                this.goalSets.forEach(gs => gs.goals.forEach(g => {
                    const bar = g.bar;
                    if (bar.completed) {
                        bar.setSchema(SchemaSuccess, {
                            name: mapStateToColor(g.displayName, g.goal.state),
                            description: formatDescription(g.goal.description),
                            link: formatLink(g.goal.url),
                            icon: mapStateToIcon(g.goal.state),
                            spinner: " ",
                        });
                        bar.archived = true;
                    } else if (g.goal.state === SdmGoalState.in_process) {
                        let tick = g.tick;
                        if (tick + 1 === Frames.length) {
                            tick = 0;
                        } else {
                            tick++;
                        }
                        bar.setSchema(SchemaRequested, {
                            name: mapStateToColor(g.displayName, g.goal.state),
                            description: formatDescription(g.goal.description),
                            link: formatLink(g.goal.url),
                            icon: mapStateToIcon(g.goal.state),
                            spinner: chalk.grey(Frames[g.tick]),
                        });
                        g.tick = tick;
                    }
                }));

                this.goalSets.filter(gs => !gs.goals.some(g => !g.bar.completed))
                    .forEach(gs => {
                        this.goalSets.splice(this.goalSets.indexOf(gs), 1);
                    });

            }, 100);
        });
    }

    public addGoals(id: string, goals: string[], p: Push) {
        process.stdout.write(push(p) + "\n");
        const gss = goals.map(g => ({
            name: g,
            displayName: strip_ansi(marked(g.split("#")[0]).trim()),
        }));

        const ml = _.maxBy(gss, "displayName.length");
        const gs = gss.map(g => ({
            displayName: _.padEnd(g.displayName, ml.name.length, " "),
            name: g.name,
        }));
        const ugs = this.unkownGoals.filter(g => g.goalSetId === id);

        const bars = gs.map(g => {
            const ug = ugs.find(tug => tug.name === g.name);
            if (ug) {
                this.unkownGoals.slice(this.unkownGoals.indexOf(ug), 1);
            }
            return {
                name: g.name,
                displayName: g.displayName,
                goal: {
                    description: (ug ? ug.description : "") || "",
                    url: (ug ? ug.externalUrl : "") || "",
                    stage: (ug ? ug.phase : "") || "",
                    state: ug ? ug.state : SdmGoalState.planned,
                },
                bar: this.createBar(
                    g.displayName,
                    ug ? ug.description : `Planned: ${g.displayName}`,
                    (ug ? ug.url : "") || "",
                    ug ? ug.state : SdmGoalState.planned),
                tick: 0,
            };
        });
        this.goalSets.push({
            goals: bars,
            goalSetId: id,
            push: p,
        });
    }

    public updateGoal(goal: SdmGoalEvent) {
        const goalSet = this.goalSets.find(gs => gs.goalSetId === goal.goalSetId);
        if (goalSet) {
            const gtu = goalSet.goals.find(g => g.name === goal.name);
            if (gtu) {
                gtu.goal.url = goal.externalUrl || "";
                if (goal.state === SdmGoalState.failure || goal.state === SdmGoalState.in_process) {
                    gtu.goal.url = goal.url || "";
                }
                gtu.goal.description = goal.description || "";
                if (goal.phase && goal.state !== SdmGoalState.success) {
                    gtu.goal.description += chalk.gray(` ${goal.phase}`);
                }
                gtu.goal.state = goal.state;
                // Update the bar
                gtu.bar.update(mapStateToRatio(goal.state), {
                    name: mapStateToColor(gtu.displayName, gtu.goal.state),
                    description: formatDescription(gtu.goal.description),
                    link: formatLink(gtu.goal.url),
                    icon: mapStateToIcon(gtu.goal.state),
                    spinner: " ",
                }, false);
            }
        } else {
            const ix = this.unkownGoals.findIndex(g => g.name === goal.name && g.goalSetId === goal.goalSetId);
            if (ix >= 0) {
                this.unkownGoals[ix] = goal;
            } else {
                this.unkownGoals.push(goal);
            }
        }
    }

    private createBar(name: string, description: string, link: string, state: SdmGoalState): any {
        const bar = new ProgressBar({
            schema: SchemaRequested,
            total: 5,
            clean: false,
            width: 5,
            filled: ".",
            blank: " ",
            spinner: " ",
            fixedWidth: true,
        });
        bar.update(mapStateToRatio(state), {
            name: mapStateToColor(name, state),
            description: formatDescription(description),
            link: formatLink(link),
            icon: mapStateToIcon(state),
            spinner: " ",
        }, true);
        return bar;
    }

}

function formatDescription(description: string): string {
    return marked(description, { gfm: true, breaks: false }).trim();
}

function formatLink(url: string): string {
    if (url && url.length > 0) {
        return `∞ ${chalk.grey(url)}`;
    }
    return "";
}

function mapStateToRatio(state: SdmGoalState): number {
    switch (state) {
        case SdmGoalState.planned:
            return 0;
        case SdmGoalState.requested:
            return 0.25;
        case SdmGoalState.in_process:
            return 0.5;
        case SdmGoalState.waiting_for_approval:
        case SdmGoalState.approved:
            return 0.75;
        case SdmGoalState.failure:
        case SdmGoalState.success:
        case SdmGoalState.skipped:
            return 1;
    }
    return 0;
}

function mapStateToIcon(state: SdmGoalState): string {
    switch (state) {
        case SdmGoalState.planned:
            return chalk.gray("▫");
        case SdmGoalState.requested:
            return chalk.gray("▹");
        case SdmGoalState.in_process:
            return chalk.yellow("▸");
        case SdmGoalState.waiting_for_approval:
        case SdmGoalState.approved:
            return chalk.yellow("॥");
        case SdmGoalState.failure:
            return chalk.red("✗");
        case SdmGoalState.success:
            return chalk.green("✓");
        case SdmGoalState.skipped:
            return chalk.yellow("▪");
    }
    return "";
}

function mapStateToColor(label: string, state: SdmGoalState): string {
    switch (state) {
        case SdmGoalState.planned:
        case SdmGoalState.requested:
            return chalk.gray(label);
        case SdmGoalState.in_process:
            return chalk.yellow(label);
        case SdmGoalState.waiting_for_approval:
        case SdmGoalState.approved:
            return chalk.yellow(label);
        case SdmGoalState.failure:
            return chalk.red(label);
        case SdmGoalState.success:
            return chalk.green(label);
        case SdmGoalState.skipped:
            return chalk.yellow(label);
    }
    return "";
}

function date() {
    return chalk.dim(formatDate("{year}-{month}-{day} {hours}:{minutes}:{seconds}", new Date()));
}

function push(p: Push) {
    return `${chalk.grey("#")} ${chalk.bold(p.repo)} ${date()} ${chalk.yellow(
        `${p.owner}/${p.repo}/${p.branch}`)} - ${chalk.yellow(p.sha.slice(0, 7))} ${p.message.split("\n")[0]}`;
}

interface GoalSet {
    push: Push;
    goalSetId: string;
    goals: Goal[];
}

interface Push {
    repo: string;
    owner: string;
    branch: string;
    sha: string;
    message: string;
}

interface Goal {
    name: string;
    displayName: string;
    goal: {
        description: string;
        url: string;
        state: SdmGoalState;
    };
    bar: any;
    tick: number;
}
// tslint:disable
/*
const c = new ConsoleGoalRendering();
let counter = 0;
setInterval(() => {
    counter++;
    if (counter > 3) {
        return;
    }
    const id = Date.now().toString();
    c.addGoals(id, ["autofix#Test.ts:14", "code review", "code reaction", "build", "deploy locally"], {
        branch: "master",
        repo: "cli",
        owner: "atomist",
        sha: id,
        message: "Update dependencies",
    });

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "autofix#Test.ts:14",
            description: "Ready to autofix",
            state: SdmGoalState.requested,
        } as SdmGoalEvent);
    }, 500);

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "autofix#Test.ts:14",
            description: "Running autofix",
            state: SdmGoalState.in_process,
            url: "https://app.atomist.com/workspace/T29E48P34/logs/atomist/sdm-local/adf25354cdbbde523e39c8c318821dca6a9e7674/0-code/review/d19bcdd0-4e12-4d65-9b9e-5096703ddbc1/5b64acdf-cac4-42a4-a7a7-1adeb549bf82",
        } as SdmGoalEvent);
    }, 2500);

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "autofix#Test.ts:14",
            description: "Autofixed `bla`",
            state: SdmGoalState.success,
        } as SdmGoalEvent);
    }, 4500);

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "build",
            description: "Ready to build",
            state: SdmGoalState.requested,
        } as SdmGoalEvent);
    }, 4500);

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "build",
            description: "Building",
            state: SdmGoalState.in_process,
        } as SdmGoalEvent);
    }, 5000);

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "build",
            description: "Build successful",
            state: SdmGoalState.success,
            phase: "tsc",
        } as SdmGoalEvent);
    }, 8000);

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "deploy locally",
            description: "Ready to deploy",
            state: SdmGoalState.requested,
        } as SdmGoalEvent);
    }, 8500);

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "deploy locally",
            description: "Deploying",
            state: SdmGoalState.in_process,
        } as SdmGoalEvent);
    }, 10000);

    setTimeout(() => {
        c.updateGoal({
            goalSetId: id,
            name: "deploy locally",
            description: "Deploy failed",
            state: SdmGoalState.failure,
            phase: "tsc",
            url: "https://app.atomist.com/workspace/T29E48P34/logs/atomist/sdm-local/adf25354cdbbde523e39c8c318821dca6a9e7674/0-code/review/d19bcdd0-4e12-4d65-9b9e-5096703ddbc1/5b64acdf-cac4-42a4-a7a7-1adeb549bf82",
        } as SdmGoalEvent);
    }, 11000);

}, 2000);
*/
