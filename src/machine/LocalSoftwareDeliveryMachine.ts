import { HandleCommand, HandleEvent, HandlerContext, logger } from "@atomist/automation-client";
import { CommandInvocation } from "@atomist/automation-client/internal/invoker/Payload";
import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { Maker, toFactory } from "@atomist/automation-client/util/constructionUtils";
import { Goal, GoalImplementation, Goals, GoalSetter, hasPreconditions, RunWithLogContext } from "@atomist/sdm";
import { chooseAndSetGoals } from "@atomist/sdm/api-helper/goal/chooseAndSetGoals";
import { executeGoal } from "@atomist/sdm/api-helper/goal/executeGoal";
import { SdmGoalImplementationMapperImpl } from "@atomist/sdm/api-helper/goal/SdmGoalImplementationMapperImpl";
import { constructSdmGoal } from "@atomist/sdm/api-helper/goal/storeGoals";
import { createPushImpactListenerInvocation } from "@atomist/sdm/api-helper/listener/createPushImpactListenerInvocation";
import { lastLinesLogInterpreter } from "@atomist/sdm/api-helper/log/logInterpreters";
import { AbstractSoftwareDeliveryMachine } from "@atomist/sdm/api-helper/machine/AbstractSoftwareDeliveryMachine";
import { selfDescribingHandlers } from "@atomist/sdm/pack/info/support/commandSearch";
import { FileSystemRemoteRepoRef, isFileSystemRemoteRepoRef } from "../binding/FileSystemRemoteRepoRef";
import { LocalHandlerContext } from "../binding/LocalHandlerContext";
import { localRunWithLogContext } from "../binding/localPush";
import { addGitHooks, removeGitHooks } from "../setup/addGitHooks";
import { LocalSoftwareDeliveryMachineConfiguration } from "./LocalSoftwareDeliveryMachineConfiguration";
import { invokeCommandHandlerWithFreshParametersInstance } from "./parameterPopulation";
import { writeToConsole } from "../invocation/cli/support/consoleOutput";

/**
 * Local SDM implementation, designed to be driven by CLI and git hooks.
 */
export class LocalSoftwareDeliveryMachine extends AbstractSoftwareDeliveryMachine<LocalSoftwareDeliveryMachineConfiguration> {

    get commandHandlers(): Array<Maker<HandleCommand>> {
        return this.registrationManager.commandHandlers;
    }

    get eventHandlers(): Array<Maker<HandleEvent<any>>> {
        return this.registrationManager.eventHandlers;
    }

    public readonly goalFulfillmentMapper = new SdmGoalImplementationMapperImpl(undefined);

    /**
     * Install git hooks in all git projects under our expanded directory structure
     * @return {Promise<void>}
     */
    public async installGitHooks() {
        const allRepos = await this.configuration.sdm.repoFinder(undefined);
        for (const rr of allRepos) {
            if (!isFileSystemRemoteRepoRef(rr)) {
                throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
            }
            await addGitHooks(rr, rr.fileSystemLocation);
        }
    }

    public async removeGitHooks() {
        const allRepos = await this.configuration.sdm.repoFinder(undefined);
        for (const rr of allRepos) {
            if (!isFileSystemRemoteRepoRef(rr)) {
                throw new Error(`Unexpected return from repo ref resolver: ${JSON.stringify(rr)}`);
            }
            await removeGitHooks(rr, rr.fileSystemLocation);
        }
    }

    /**
     * Invoked after commit. Pretend it's a push
     * @param {string} baseDir
     * @param branch base
     * @param sha sha
     * @return {Promise<Promise<any>>}
     */
    public async postCommit(baseDir: string, branch: string, sha: string) {
        return this.doWithProjectUnderExpandedDirectoryTree(baseDir, branch, sha,
            async p => {
                const rwlc = await localRunWithLogContext(p);
                const goals = await chooseAndSetGoals(
                    {
                        repoRefResolver: this.configuration.sdm.repoRefResolver,
                        goalsListeners: this.goalsSetListeners,
                        goalSetter: this.pushMapping,
                        projectLoader: this.configuration.sdm.projectLoader,
                        implementationMapping: this.goalFulfillmentMapper,
                    },
                    {
                        credentials: rwlc.credentials,
                        context: rwlc.context,
                        push: rwlc.status.commit.pushes[0],
                    },
                );
                return this.executeGoals(goals, p, rwlc);
            });
    }

    private async executeGoals(goals: Goals,
                               p: GitProject,
                               rwlc: RunWithLogContext,
                               stillPending: Goal[] = goals.goals): Promise<any> {
        function stillWaiting(g: Goal) {
            return hasPreconditions(g) && g.dependsOn.some(dep => stillPending.includes(dep));
        }

        logger.info("Still pending: %s", stillPending.map(g => g.name));
        const completedInThisRun = await Promise.all(stillPending
            .filter(g => !stillWaiting(g))
            .map(async goal => {
                await this.execGoal(p, rwlc, goal);
                return goal;
            }),
        );
        logger.info("Executed this run: %s", completedInThisRun.map(g => g.name));

        const stillNotDone = stillPending.filter(
            elt => !completedInThisRun.includes(elt));
        if (stillNotDone.length === 0) {
            writeToConsole({ message: "Goal execution complete", color: "green" });
        } else {
            return this.executeGoals(goals, p, rwlc, stillNotDone);
        }
    }

    /**
     * Return metadata for the given command, or undefined if there isn't one with this name
     * @param {string} name
     * @return {CommandHandlerMetadata}
     */
    public commandMetadata(name: string): CommandHandlerMetadata {
        const handlers = selfDescribingHandlers(this);
        return handlers.filter(h => h.instance.name === name)
            .map(hi => hi.instance)
            .find(() => true);
    }

    /**
     * Return metadata for all commands
     * @return {CommandHandlerMetadata[]}
     */
    public get commandsMetadata(): CommandHandlerMetadata[] {
        return selfDescribingHandlers(this)
            .map(hi => hi.instance);
    }

    // TODO break dependency on client
    public async executeCommand(invocation: CommandInvocation): Promise<any> {
        const handlers = selfDescribingHandlers(this);
        const handler = handlers.find(h => h.instance.name === invocation.name);
        if (!handler) {
            throw new Error(`No command found with name '${invocation.name}'`);
        }
        const instance = toFactory(handler.maker)();
        const context: HandlerContext = new LocalHandlerContext(null);
        const parameters = !!instance.freshParametersInstance ?
            instance.freshParametersInstance() :
            instance;
        await invokeCommandHandlerWithFreshParametersInstance(
            instance,
            handler.instance,
            parameters,
            invocation.args,
            context,
            this.configuration.mappedParameterResolver);
    }

    private async execGoal(project: GitProject,
                           rwlc: RunWithLogContext,
                           goal: Goal) {
        const pli = createPushImpactListenerInvocation(rwlc, project);
        const goalFulfillment: GoalImplementation = await this.goalFulfillmentMapper.findFulfillmentByPush(goal, pli as any) as GoalImplementation;
        if (!goalFulfillment) {
            throw new Error(`Error: No implementation for goal '${goal.uniqueCamelCaseName}'`);
        }
        const sdmGoal = constructSdmGoal(rwlc.context, {
            goal,
            state: "requested",
            fulfillment: goalFulfillment.goalExecutor,
            id: { ...rwlc.id, branch: project.branch },
        } as any);
        const goalResult = await executeGoal({
                // tslint:disable-next-line:no-invalid-this
                projectLoader: this.configuration.sdm.projectLoader,
            },
            goalFulfillment.goalExecutor,
            rwlc,
            sdmGoal, goal, lastLinesLogInterpreter("thing"));
        if (goalResult.code !== 0) {
            await writeToConsole({
                message: `✖︎︎ ${goal.successDescription}`,
                color: "red",
            });
            throw new Error(`Code was nonzero`);
        } else {
            await writeToConsole({
                message: `✔ ${goal.successDescription}`,
                color: "green",
            });
        }
    }

    private async doWithProjectUnderExpandedDirectoryTree(baseDir: string,
                                                          branch: string,
                                                          sha: string,
                                                          action: (p: GitProject) => Promise<any>) {
        const p = GitCommandGitProject.fromBaseDir(
            FileSystemRemoteRepoRef.fromDirectory(this.configuration.repositoryOwnerParentDirectory,
                baseDir, branch, sha),
            baseDir,
            {},
            () => null);
        return action(p);
    }

    constructor(name: string,
                configuration: LocalSoftwareDeliveryMachineConfiguration,
                ...goalSetters: Array<GoalSetter | GoalSetter[]>) {
        super(name, configuration, goalSetters);
    }

}
