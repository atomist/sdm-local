
import { ExecuteGoalResult, Goal, Goals } from "@atomist/sdm";

/**
 * Interface allowing goals to be displayed
 */
export interface GoalDisplayer {

    displayGoalsSet(sha: string, goals: Goals);

    displayGoalWorking(sha: string, goal: Goal, goals: Goals);

    displayGoalResult(sha: string, goal: Goal, ger: ExecuteGoalResult, goals: Goals);
}
