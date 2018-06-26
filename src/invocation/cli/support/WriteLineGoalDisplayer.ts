import { ExecuteGoalResult, Goal, Goals } from "@atomist/sdm";
import { GoalDisplayer } from "./GoalDisplayer";

import chalk from "chalk";

/**
 * Display goals by writing each goal update to its own line on the console
 */
export class WriteLineGoalDisplayer implements GoalDisplayer {

    public displayGoalsSet(goals: Goals) {
        process.stdout.write(chalk.yellow(`▶ Goals: ${goals.goals.map(g => chalk.italic(g.name)).join(" ⏦ ")}\n`));
    }

    public displayGoalWorking(goal: Goal, goals: Goals) {
        process.stdout.write(chalk.yellow(`⚙︎ ${goal.inProcessDescription}\n`));
    }

    public displayGoalResult(goal: Goal, ger: ExecuteGoalResult, goals: Goals) {
        if (ger.code !== 0) {
            process.stdout.write(chalk.red(`✖︎︎ ${goal.failureDescription}\n`));
        } else {
            process.stdout.write(chalk.green(`✔ ${goal.successDescription}\n`));
        }
    }
}
