export function suppressConsoleLogging() {
    if (process.env.ATOMIST_DISABLE_LOGGING !== "false") {
        // Allow explicit enabling
        process.env.ATOMIST_DISABLE_LOGGING = "true";
    }
    process.env.SUPPRESS_NO_CONFIG_WARNING = "true";
    console.debug = () => {
        // ignore
    };
}

// Fake an empty configuration object for automation-client
// We can get rid of this if we break our dependency on client
(global as any).__runningAutomationClient = {
    configuration: {},
};
