import * as asyncPolling from "async-polling";

/**
 * Watch this indefinitely
 * @param {() => Promise<void>} f
 * @param {number} intervalMillis
 * @return {Promise<void>}
 */
export async function doForever(f: () => Promise<void>, intervalMillis: number) {
    const polling = asyncPolling(async () => {
        // We never finish
        await f();
    }, intervalMillis);

    polling.on("error", (error: Error) => {
        // The polling encountered an error, handle it here.
    });
    // We never complete so don't need to react to this
    polling.run();
}
