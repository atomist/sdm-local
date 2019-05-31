/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as assert from "power-assert";
import { isValidSHA1 } from "../../../lib/common/git/handlePushBasedEventOnRepo";

describe("common/git/handlePushBasedEventOnRepo", () => {

    describe("isValidSHA1", () => {

        it("should validate a SHA1", () => {
            const ss = [
                "1234567890abcdef1234567890abcdef12345678",
                "33e38b6c72788866004acfd736ed12b2e9529ea7",
                "f6dee8b272248aab385f840f4799a707dcb7af26",
                "b8947fc4370c99d3137d7d6b6e20ec26c8036370",
            ];
            ss.forEach(s => assert(isValidSHA1(s)));
        });

        it("should not validate invalid SHA1", () => {
            const ss = [
                // tslint:disable-next-line:no-null-keyword
                null,
                undefined,
                "",
                "master",
                "some-branch",
                "other/branch",
                "b8947fc4370c99d3137d7d6b6e20ec26c8036370a",
                "masterb8947fc4370c99d3137d7d6b6e20ec26c8036370",
            ];
            ss.forEach(s => assert(!isValidSHA1(s)));
        });

    });

});
