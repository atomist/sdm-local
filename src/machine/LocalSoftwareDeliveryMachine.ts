import { HandleCommand, HandleEvent, HandlerContext, logger } from "@atomist/automation-client";
import { CommandInvocation } from "@atomist/automation-client/internal/invoker/Payload";
import { CommandHandlerMetadata } from "@atomist/automation-client/metadata/automationMetadata";
import { GitCommandGitProject } from "@atomist/automation-client/project/git/GitCommandGitProject";
import { GitProject } from "@atomist/automation-client/project/git/GitProject";
import { Maker, toFactory } from "@atomist/automation-client/util/constructionUtils";
import {
    AddressChannels,
    BuildListenerInvocation,
    BuildStatus,
    Goal,
    GoalImplementation,
    GoalInvocation,
    Goals,
    GoalSetter,
    hasPreconditions, PushFields,
} from "@atomist/sdm";
import { selfDescribingHandlers } from "@atomist/sdm-core";
import { chooseAndSetGoals } from "@atomist/sdm/api-helper/goal/chooseAndSetGoals";
import { executeGoal } from "@atomist/sdm/api-helper/goal/executeGoal";
import { SdmGoalImplementationMapperImpl } from "@atomist/sdm/api-helper/goal/SdmGoalImplementationMapperImpl";
import { createPushImpactListenerInvocation } from "@atomist/sdm/api-helper/listener/createPushImpactListenerInvocation";
import { lastLinesLogInterpreter } from "@atomist/sdm/api-helper/log/logInterpreters";
import { AbstractSoftwareDeliveryMachine } from "@atomist/sdm/api-helper/machine/AbstractSoftwareDeliveryMachine";
import { FileSystemRemoteRepoRef, isFileSystemRemoteRepoRef } from "../binding/FileSystemRemoteRepoRef";
import { LocalHandlerContext } from "../binding/LocalHandlerContext";
import { localGoalInvocation, pushFromLastCommit } from "../binding/localPush";
import { warning } from "../invocation/cli/support/consoleOutput";
import { addGitHooks, removeGitHooks } from "../setup/addGitHooks";
import { LocalSoftwareDeliveryMachineConfiguration } from "./LocalSoftwareDeliveryMachineConfiguration";
import { invokeCommandHandlerWithFreshParametersInstance } from "./parameterPopulation";

import { EventIncoming } from "@atomist/automation-client/internal/transport/RequestProcessor";
import { ProjectOperationCredentials } from "@atomist/automation-client/operations/common/ProjectOperationCredentials";
import { RemoteRepoRef } from "@atomist/automation-client/operations/common/RepoId";
import { BuildStatusUpdater } from "@atomist/sdm-core/internal/delivery/build/local/LocalBuilder";
import chalk from "chalk";
import { messageClientAddressChannels } from "../invocation/cli/io/messageClientAddressChannels";

/**
 * Local SDM implementation, designed to be driven by CLI and git hooks.
 */
export class LocalSoftwareDeliveryMachine
    extends AbstractSoftwareDeliveryMachine<LocalSoftwareDeliveryMachineConfiguration>
    implements BuildStatusUpdater {

    get commandHandlers(): Array<Maker<HandleCommand>> {
        return this.registrationManager.commandHandlers;
    }

    get eventHandlers(): Array<Maker<HandleEvent<any>>> {
        return this.registrationManager.eventHandlers;
    }

    get ingesters(): string[] {
        throw new Error("Ingesters are not supported in local SDM");
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
            await this.installGitHooksFor(rr);
        }
    }

    /**
     * Install git hooks in the given repo
     * @param {FileSystemRemoteRepoRef} rr
     * @return {Promise<void>}
     */
    public async installGitHooksFor(rr: FileSystemRemoteRepoRef) {
        return addGitHooks(rr, rr.fileSystemLocation, this.configuration.gitHookScript);
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

    public postMerge = this.postCommit;

    public preReceive = this.postCommit;

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
                const context = new LocalHandlerContext(p.id.repo, {} as EventIncoming);
                // TODO fix this. But shouldn't be checked in in case it's real
                const credentials: ProjectOperationCredentials = { token: "ABCD" };
                const push = await pushFromLastCommit(p);

                if (!this.pushMapping) {
                    logger.debug("Push received, but there are no pushMappings");
                    return;
                }
                const goals = await chooseAndSetGoals(
                    {
                        repoRefResolver: this.configuration.sdm.repoRefResolver,
                        goalsListeners: this.goalsSetListeners,
                        goalSetter: this.pushMapping,
                        projectLoader: this.configuration.sdm.projectLoader,
                        implementationMapping: this.goalFulfillmentMapper,
                    },
                    {
                        credentials,
                        context,
                        push,
                    },
                );
                if (!goals) {
                    warning("No goals set for push");
                    return;
                }
                this.configuration.goalDisplayer.displayGoalsSet(push, goals);
                return this.executeGoals(goals, p, context, credentials, push);
            });
    }

    /**
     * Execute as many goals as we can at this time, recursing
     * until done
     * @param {Goals} goals
     * @param {GitProject} p
     * @param {GoalInvocation} goalInvocation
     * @param {Goal[]} stillPending
     * @return {Promise<any>}
     */
    private async executeGoals(goals: Goals,
                               p: GitProject,
                               context: HandlerContext,
                               credentials: ProjectOperationCredentials,
                               push: PushFields.Fragment,
                               stillPending: Goal[] = goals.goals): Promise<any> {
        function stillWaiting(g: Goal) {
            return hasPreconditions(g) && g.dependsOn.some(dep => stillPending.includes(dep));
        }

        logger.info("Still pending: %s", stillPending.map(g => g.name));
        const completedInThisRun = await Promise.all(stillPending
            .filter(g => !stillWaiting(g))
            .map(async goal => {
                await this.execGoal(p, context, credentials, push, goal, goals);
                return goal;
            }),
        );
        logger.info("Executed this run: %s", completedInThisRun.map(g => g.name));

        const stillNotDone = stillPending.filter(elt => !completedInThisRun.includes(elt));
        if (stillNotDone.length === 0) {
            process.stdout.write(chalk.green("■ Goal execution complete\n"));
        } else {
            return this.executeGoals(goals, p, context, credentials, push, stillNotDone);
        }
    }

    public async updateBuildStatus(runningBuild: { repoRef: RemoteRepoRef; url: string; team: string },
                                   status: string,
                                   branch: string,
                                   buildNo: string): Promise<any> {
        const id = runningBuild.repoRef;
        const context = new LocalHandlerContext(
            runningBuild.repoRef.repo,
            {} as EventIncoming);
        const addressChannels: AddressChannels = messageClientAddressChannels(id, context);
        const bli: BuildListenerInvocation = {
            context,
            id,
            credentials: null,
            addressChannels,
            build: { buildId: buildNo, status: status as any as BuildStatus },
        };
        await Promise.all(this.buildListeners
            .map(l => l(bli)),
        );
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
        const context: HandlerContext = new LocalHandlerContext("general", null);
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
                           context: HandlerContext,
                           credentials: ProjectOperationCredentials,
                           push: PushFields.Fragment,
                           goal: Goal,
                           goals: Goals) {
        logger.info("Executing goal %s", goal.name);
        this.configuration.goalDisplayer.displayGoalWorking(push, goal, goals);
        const goalInvocation = await localGoalInvocation(project, context, credentials, push, goal, goals);
        const pli = await createPushImpactListenerInvocation(goalInvocation, project);
        const goalFulfillment: GoalImplementation = await this.goalFulfillmentMapper.findFulfillmentByPush(goal, pli as any) as GoalImplementation;
        if (!goalFulfillment) {
            // Warn the user. Don't fail.
            // throw new Error(`Error: No implementation for goal '${goal.uniqueCamelCaseName}'`);
            warning(`No implementation for goal '${goal.uniqueCamelCaseName}'\n`);
            return;
        }
        const goalResult = await executeGoal({
                // tslint:disable-next-line:no-invalid-this
                projectLoader: this.configuration.sdm.projectLoader,
            },
            goalFulfillment.goalExecutor,
            goalInvocation,
            goalInvocation.sdmGoal,
            goal, lastLinesLogInterpreter(goal.name));
        this.configuration.goalDisplayer.displayGoalResult(push, goal, goalResult, goals);
    }

    private async doWithProjectUnderExpandedDirectoryTree(baseDir: string,
                                                          branch: string,
                                                          sha: string,
                                                          action: (p: GitProject) => Promise<any>) {
        const p = GitCommandGitProject.fromBaseDir(
            FileSystemRemoteRepoRef.fromDirectory({
                repositoryOwnerParentDirectory: this.configuration.repositoryOwnerParentDirectory,
                baseDir, branch, sha,
            }),
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
