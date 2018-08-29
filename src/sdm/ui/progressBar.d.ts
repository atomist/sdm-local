export declare function init(cursor: { row: number, col: number}): void;
export declare class ProgressBar {
    constructor(tokens: any);
    update(tick: number, tokens: any): void;
}