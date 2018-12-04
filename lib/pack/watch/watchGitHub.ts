import { AdminCommunicationContext, ExtensionPack, metadata } from "@atomist/sdm";
import { initiateWatch } from "../../cli/invocation/command/addWatchRemoteCommand";

/**
 * An extension pack for watching a single remote SCM.
 * Currently supports only GitHub.
 *
 * Configuration:
 * sdm.scm.owner configuration is required -- name of your GitHub owner
 * sdm.scm.user should be "true" if this is the name of an owner, not an org
 * sdm.scm.intervalSeconds changes the polling interval, which defaults to 10 seconds
 * sdm.scm.apiBase enables you to set your GHE server: default is GitHub.com
 *
 * You must also set GITHUB_TOKEN in your environment.
 */
export const WatchGitHub: ExtensionPack = {
    ...metadata("watch-github"),
    // requiredConfigurationValues: [
    //     {
    //         path: "sdm.watch.github.owner",
    //         type: ConfigurationValueType.String,
    //     },
    // ],
    configure: sdm => {
        sdm.addStartupListener(startListening);
    },
};

async function startListening(cc: AdminCommunicationContext): Promise<void> {
    const owner = cc.sdm.configuration.sdm.watch.github.owner || process.env.GITHUB_OWNER;
    if (!owner) {
        throw new Error("Configuration key 'sdm.watch.github.owner' or environment variable GITHUB_OWNER must be set to watch GitHub");
    }
    return initiateWatch({
        owner,
        provider: "github",
        apiBase: cc.sdm.configuration.sdm.watch.github.apiBase,
        seconds: cc.sdm.configuration.sdm.watch.github.intervalSeconds,
        user: !!cc.sdm.configuration.sdm.watch.github.user,
    });
}
