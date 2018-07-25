import { ExecuteGoalResult, Goal, Goals, GoalsSetListenerInvocation, OnPushToAnyBranch } from "@atomist/sdm";

import chalk from "chalk";

/**
 * Display goals by writing each goal update to its own line on the console
 */
export class WriteLineGoalDisplayer {

    public renderGoalsSet(gsi: GoalsSetListenerInvocation) {
        const push = null;
        return chalk.yellow(`▶ Goals for ${push.commits[0].sha}: ${gsi.goalSet.goals.map(g => chalk.italic(g.name)).join(" ⏦ ")}\n`) +
            `\t${chalk.italic(push.commits[0].message)}\n`;
    }

    public displayGoalWorking(push: OnPushToAnyBranch.Push, goal: Goal, goals: Goals) {
        return chalk.yellow(`⚙︎ ${goal.inProcessDescription}\n`);
    }

    public displayGoalResult(push: OnPushToAnyBranch.Push, goal: Goal, ger: ExecuteGoalResult, goals: Goals) {
        if (ger.code !== 0) {
            return chalk.red(`✖︎︎ ${goal.failureDescription}\n`);
        } else {
            return chalk.green(`✔ ${goal.successDescription}\n`);
        }
    }
}
