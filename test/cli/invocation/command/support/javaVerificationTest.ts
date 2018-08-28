/*
 * Copyright © 2018 Atomist, Inc.
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

import * as assert from "assert";
import { verifyJavaTest, verifyMavenTest } from "../../../../../src/cli/invocation/command/support/javaVerification";

describe("javaVerification", () => {

    describe("mavenVerification", () => {

        it("should reject invalid", () => {
            assert(!verifyMavenTest({ stdout: "woeiruowieur"}));
        });

        it("should parse valid Maven version", () => {
            assert(verifyMavenTest({ stdout: `Apache Maven 3.5.0 (ff8f5e7444045639af65f6095c62210b5713f426; 2017-04-03T12:39:06-07:00)
Maven home: /usr/local/Cellar/maven/3.5.0/libexec
Java version: 1.8.0_111, vendor: Oracle Corporation
Java home: /Library/Java/JavaVirtualMachines/jdk1.8.0_111.jdk/Contents/Home/jre
Default locale: en_US, platform encoding: UTF-8
OS name: "mac os x", version: "10.13.3", arch: "x86_64", family: "mac"
`}));
        });

    });

    describe("javaVerification", () => {

        it("should reject invalid Java version", () => {
            assert(!verifyJavaTest({stdout: "woeiruowieur"}));
        });

        it("should parse valid Oracle Java version", () => {
            assert(verifyJavaTest({stdout: `java version "1.8.0_111"
Java(TM) SE Runtime Environment (build 1.8.0_111-b14)
Java HotSpot(TM) 64-Bit Server VM (build 25.111-b14, mixed mode)
`}));
        });

        it("should parse obsolete Oracle Java version", () => {
            assert(!verifyJavaTest({stdout: `java version "1.7.0_111"
Java(TM) SE Runtime Environment (build 1.7.0_111-b14)
Java HotSpot(TM) 64-Bit Server VM (build 25.111-b14, mixed mode)
`}));
        });

        it("should parse Java 10 Oracle Java version", () => {
            assert(verifyJavaTest({stdout: `java version "10.0.1" 2018-04-17
Java(TM) SE Runtime Environment 18.3 (build 10.0.1+10)
Java HotSpot(TM) 64-Bit Server VM 18.3 (build 10.0.1+10, mixed mode)
`}));
        });

        it("should parse Java 9 Oracle Java version", () => {
            assert(verifyJavaTest({stdout: `java version "9"
Java(TM) SE Runtime Environment (build 9+181)
Java HotSpot(TM) 64-Bit Server VM (build 9+181, mixed mode)
`}));
        });

    });
});
