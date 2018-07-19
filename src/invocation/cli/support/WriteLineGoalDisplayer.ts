import { ExecuteGoalResult, Goal, Goals, OnPushToAnyBranch } from "@atomist/sdm";
import { GoalDisplayer } from "./GoalDisplayer";

import chalk from "chalk";

/**
 * Display goals by writing each goal update to its own line on the console
 */
export class WriteLineGoalDisplayer implements GoalDisplayer {

    public displayGoalsSet(push: OnPushToAnyBranch.Push, goals: Goals) {
        process.stdout.write(chalk.yellow(`▶ Goals for ${push.commits[0].sha}: ${goals.goals.map(g => chalk.italic(g.name)).join(" ⏦ ")}\n`));
        process.stdout.write(`\t${chalk.italic(push.commits[0].message)}\n`);
    }

    public displayGoalWorking(push: OnPushToAnyBranch.Push, goal: Goal, goals: Goals) {
        process.stdout.write(chalk.yellow(`⚙︎ ${goal.inProcessDescription}\n`));
    }

    public displayGoalResult(push: OnPushToAnyBranch.Push, goal: Goal, ger: ExecuteGoalResult, goals: Goals) {
        if (ger.code !== 0) {
            process.stdout.write(chalk.red(`✖︎︎ ${goal.failureDescription}\n`));
        } else {
            process.stdout.write(chalk.green(`✔ ${goal.successDescription}\n`));
        }
    }
}
