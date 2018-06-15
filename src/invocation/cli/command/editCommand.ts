import { logger } from "@atomist/automation-client";
import { Arg } from "@atomist/automation-client/internal/transport/RequestProcessor";
import { EditorTag } from "@atomist/sdm/api-helper/machine/commandRegistrations";
import { commandHandlersWithTag } from "@atomist/sdm/pack/info/support/commandSearch";
import { Argv } from "yargs";
import { determineCwd, withinExpandedTree } from "../../../binding/expandedTreeUtils";
import { LocalSoftwareDeliveryMachine } from "../../../machine/LocalSoftwareDeliveryMachine";
import { logExceptionsToConsole } from "../support/consoleOutput";

export function addEditCommand(sdm: LocalSoftwareDeliveryMachine, yargs: Argv) {
    yargs.command({
        command: "edit <editor> [owner] [repos]",
        aliases: ["e"],
        describe: "Edit <editorName> [owner] [repos]",
        handler: argv => {
            logger.debug("Args are %j", argv);
            const extraArgs = Object.getOwnPropertyNames(argv)
                .map(name => ({ name, value: argv[name] }));
            return logExceptionsToConsole(() => edit(sdm, argv.editor, argv.owner, argv.repos, extraArgs));
        },
    });
}

async function edit(sdm: LocalSoftwareDeliveryMachine,
                    commandName: string,
                    targetOwner: string | undefined,
                    targetRepos: string | undefined,
                    extraArgs: Arg[]): Promise<any> {
    const hm = sdm.commandMetadata(commandName);
    if (!hm || !!hm.tags && !hm.tags.some(t => t.name === EditorTag)) {
        logger.error(`No editor with name [${commandName}]: Known editors are [${commandHandlersWithTag(sdm, EditorTag).map(m => m.instance.name)}]`);
        process.exit(1);
    }

    if (!(!!targetOwner && !!targetRepos) && !withinExpandedTree(sdm.configuration.repositoryOwnerParentDirectory)) {
        throw new Error(`Please supply 'owner' and 'repos' parameters when not within the expanded directory tree under ${
            sdm.configuration.repositoryOwnerParentDirectory}: in ${determineCwd()}`);
    }

    const args = [
        { name: "targets.owner", value: targetOwner },
        { name: "targets.repos", value: targetRepos },
        { name: "github://user_token?scopes=repo,user:email,read:user", value: null },
    ].concat(extraArgs)
        .filter(a => a.value !== undefined);

    logger.info("Executing edit command %s with args %j", commandName, args);
    return sdm.executeCommand({ name: commandName, args });
}
