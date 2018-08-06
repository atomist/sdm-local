import { HostnameLocalHostUrlAliaser, LocalHostUrlAliaser } from "./LocalHostUrlAliaser";

export function defaultHostUrlAliaser(): LocalHostUrlAliaser {
    return HostnameLocalHostUrlAliaser;
}