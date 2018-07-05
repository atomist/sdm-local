/**
 * Interface allowing goals to be displayed
 */
import { ExecuteGoalResult, Goal, Goals } from "@atomist/sdm";

export interface GoalDisplayer {

    displayGoalsSet(sha: string, goals: Goals);

    displayGoalWorking(sha: string, goal: Goal, goals: Goals);

    displayGoalResult(sha: string, goal: Goal, ger: ExecuteGoalResult, goals: Goals);
}
