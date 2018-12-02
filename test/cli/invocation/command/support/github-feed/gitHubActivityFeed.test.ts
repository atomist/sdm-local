import { isPushEvent, readGitHubActivityFeed } from "../../../../../../lib/cli/invocation/command/support/github-feed/gitHubActivityFeed";

describe("gitHubActivityFeed", () => {

    it("should connect to org", async () => {
        const events = await readGitHubActivityFeed({ owner: "spring-team", token: null});
        const pushEvents = events.filter(isPushEvent);
        process.stdout.write(`Events length is ${events.length}, push events=${pushEvents.length}`);
        process.stdout.write(JSON.stringify(pushEvents, null, 2));
    }).timeout(10000);

});
