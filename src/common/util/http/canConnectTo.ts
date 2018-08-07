import axios from "axios";

/**
 * Return whether we can connect to this URL
 * @param {string} url
 * @return {Promise<boolean>}
 */
export async function canConnectTo(url: string): Promise<boolean> {
    try {
        await axios.head(url);
        return true;
    } catch (err) {
        return false;
    }
}
