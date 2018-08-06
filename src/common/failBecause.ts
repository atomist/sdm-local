
/**
 * Can be used anywhere we need a value, to fail
 * @param {string} msg
 * @return {string}
 */
export function failBecause(msg: string): any {
    throw new Error(msg);
}