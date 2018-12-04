import { AdminCommunicationContext, ConfigurationValueType, ExtensionPack, metadata } from "@atomist/sdm";
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
export const ScmWatch: ExtensionPack = {
    ...metadata("scm-watch"),
    requiredConfigurationValues: [
        {
            path: "sdm.scm.owner",
            type: ConfigurationValueType.String,
        },
    ],
    configure: sdm => {
        sdm.addStartupListener(startListening);
    },
};

async function startListening(cc: AdminCommunicationContext): Promise<void> {
    return initiateWatch({
        owner: cc.sdm.configuration.sdm.scm.owner,
        provider: "github",
        apiBase: cc.sdm.configuration.sdm.scm.apiBase,
        seconds: cc.sdm.configuration.sdm.scm.intervalSeconds,
        user: !!cc.sdm.configuration.sdm.scm.user,
    });
}
