/**
 * Interface allowing goals to be displayed
 */
import { ExecuteGoalResult, Goal, Goals } from "@atomist/sdm";

export interface GoalDisplayer {

    displayGoalsSet(goals: Goals);

    displayGoalWorking(goal: Goal, goals: Goals);

    displayGoalResult(goal: Goal, ger: ExecuteGoalResult, goals: Goals);
}
