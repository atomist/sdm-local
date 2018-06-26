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
