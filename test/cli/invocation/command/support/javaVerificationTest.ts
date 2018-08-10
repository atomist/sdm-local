import { verifyJavaTest, verifyMavenTest } from "../../../../../src/cli/invocation/command/support/javaVerification";
import * as assert from "assert";

describe("javaVerification", () => {

    describe("javaVerification", () => {

        it.skip("should reject invalid", () => {
            assert(!verifyJavaTest()("woeiruowieur"));
        });

        it("should parse valid", () => {
            assert(verifyJavaTest()(`Apache Maven 3.5.0 (ff8f5e7444045639af65f6095c62210b5713f426; 2017-04-03T12:39:06-07:00)
Maven home: /usr/local/Cellar/maven/3.5.0/libexec
Java version: 1.8.0_111, vendor: Oracle Corporation
Java home: /Library/Java/JavaVirtualMachines/jdk1.8.0_111.jdk/Contents/Home/jre
Default locale: en_US, platform encoding: UTF-8
OS name: "mac os x", version: "10.13.3", arch: "x86_64", family: "mac"
`));
        });

    });

    describe("mavenVerification", () => {

        it.skip("should reject invalid", () => {
            assert(!verifyMavenTest()("woeiruowieur"));
        });

        it("should parse valid", () => {
            assert(verifyMavenTest()(`java version "1.8.0_111"
Java(TM) SE Runtime Environment (build 1.8.0_111-b14)
Java HotSpot(TM) 64-Bit Server VM (build 25.111-b14, mixed mode)
`));
        });

    });
});
