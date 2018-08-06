
import * as os from "os";

/**
 * Some systems can have problems with resolving localhost,
 * so this is a strategy interface to allow it to be switchable
 */
export interface LocalHostUrlAliaser {

    alias(): string;
}

export const LocalHostLocalHostUrlAliaser: LocalHostUrlAliaser = {

    alias() {
        return "localhost";
    }
};

export const HostnameLocalHostUrlAliaser: LocalHostUrlAliaser = {

    alias() {
        return os.hostname();
    }
};
