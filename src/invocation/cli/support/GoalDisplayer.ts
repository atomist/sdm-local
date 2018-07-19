
import { ExecuteGoalResult, Goal, Goals, OnPushToAnyBranch } from "@atomist/sdm";

/**
 * Interface allowing goals to be displayed
 */
export interface GoalDisplayer {

    displayGoalsSet(push: OnPushToAnyBranch.Push, goals: Goals);

    displayGoalWorking(push: OnPushToAnyBranch.Push, goal: Goal, goals: Goals);

    displayGoalResult(push: OnPushToAnyBranch.Push, goal: Goal, ger: ExecuteGoalResult, goals: Goals);
}
