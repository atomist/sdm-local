# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased](https://github.com/atomist/sdm-local/compare/1.0.3...HEAD)

### Fixed

-   Don't disable logging by just depending on sdm-local. [cfedbc9](https://github.com/atomist/sdm-local/commit/cfedbc91ca3c20bf31370451cca4c95cc20e027d)

## [1.0.3](https://github.com/atomist/sdm-local/compare/1.0.2...1.0.3) - 2018-12-08

### Fixed

-   SDM local mode ignores token configuration value. [#215](https://github.com/atomist/sdm-local/issues/215)

## [1.0.2](https://github.com/atomist/sdm-local/compare/1.0.1...1.0.2) - 2018-11-09

### Fixed

-   Don't install local config and local lifecycle extension packs more then once

## [1.0.1](https://github.com/atomist/sdm-local/compare/1.0.0...1.0.1) - 2018-11-09

## [1.0.0](https://github.com/atomist/sdm-local/compare/1.0.0-RC.2...1.0.0) - 2018-11-09

## [1.0.0-RC.2](https://github.com/atomist/sdm-local/compare/1.0.0-RC.1...1.0.0-RC.2) - 2018-10-30

### Changed

-   Do not import everything from automation-client. [#207](https://github.com/atomist/sdm-local/issues/207)

## [1.0.0-RC.1](https://github.com/atomist/sdm-local/compare/1.0.0-M.5...1.0.0-RC.1) - 2018-10-15

### Added

-   Publish a notice to the feed on startup. [#205](https://github.com/atomist/sdm-local/issues/205)

### Changed

-   **BREAKING** Change the default Atomist project directory. [#204](https://github.com/atomist/sdm-local/issues/204)

### Fixed

-   Have post-receive hook script read from stdin. [#211](https://github.com/atomist/sdm-local/issues/211)

## [1.0.0-M.5](https://github.com/atomist/sdm-local/compare/1.0.0-M.4...1.0.0-M.5) - 2018-09-26

### Changed

-   Run git hooks in foreground on win32. [#196](https://github.com/atomist/sdm-local/pull/196)

### Fixed

-   Improve directory path comparisons. [#197](https://github.com/atomist/sdm-local/pull/197)
-   Encode the action name correctly. [#201](https://github.com/atomist/sdm-local/issues/201)

## [1.0.0-M.4](https://github.com/atomist/sdm-local/compare/1.0.0-M.3...1.0.0-M.4) - 2018-09-16

### Added

-   Do not include SDMs not in local mode. [#180](https://github.com/atomist/sdm-local/issues/180)
-   Make it really easy to create an extension pack. [#131](https://github.com/atomist/sdm-local/issues/131)

### Changed

-   Use 'warn' log level in embedded SDM. [#176](https://github.com/atomist/sdm-local/issues/176)
-   Error reporting. [#170](https://github.com/atomist/sdm-local/issues/170)

### Removed

-   Remove sample-sdm from create sdm. [#189](https://github.com/atomist/sdm-local/issues/189)

### Fixed

-   Local mode doesn’t set a default workspaceId. [#172](https://github.com/atomist/sdm-local/issues/172)

## [1.0.0-M.3](https://github.com/atomist/sdm-local/compare/1.0.0-M.2...1.0.0-M.3) - 2018-09-04

### Added

-   `atomist clone` only works with http addresses. [#152](https://github.com/atomist/sdm-local/issues/152)
-   Add additional _experimental_ view for goals with `atomist feed --goals`. [#163](https://github.com/atomist/sdm-local/issues/163)
-   Allow to merge local pull request branches. [#167](https://github.com/atomist/sdm-local/issues/167)

### Fixed

-   Pass mapped parameters along through form in action button. [#148](https://github.com/atomist/sdm-local/issues/148)
-   Creating a new blank SDM results in HTTP 500 errors in log. [#155](https://github.com/atomist/sdm-local/issues/155)
-   Fix architecture picture and atomist.com link. [#157](https://github.com/atomist/sdm-local/issues/157)
-   Post-receive hook sends wrong commit data for branch commit. [#158](https://github.com/atomist/sdm-local/issues/158)
-   Using `os.hostname()` not working for users. [#160](https://github.com/atomist/sdm-local/issues/160)
-   Running multiple local SDMs causes port collisions. [#162](https://github.com/atomist/sdm-local/issues/162)

## [1.0.0-M.2](https://github.com/atomist/sdm-local/compare/1.0.0-M.1...1.0.0-M.2) - 2018-08-27

### Fixed

-   Create SDM does not work if ~/atomist does not exist. [#150](https://github.com/atomist/sdm-local/issues/150)

## [1.0.0-M.1](https://github.com/atomist/sdm-local/compare/0.1.21...1.0.0-M.1) - 2018-08-27

## [0.1.21](https://github.com/atomist/sdm-local/compare/0.1.20...0.1.21) - 2018-08-27

### Fixed

-   Fail gracefully when in a directory other than the atomist root. [#143](https://github.com/atomist/sdm-local/issues/143)

## [0.1.20](https://github.com/atomist/sdm-local/compare/0.1.19...0.1.20) - 2018-08-25

## [0.1.19](https://github.com/atomist/sdm-local/compare/0.1.18...0.1.19) - 2018-08-25

### Fixed

-   Do not create log/ directories in every repo. [#138](https://github.com/atomist/sdm-local/issues/138)

## [0.1.18](https://github.com/atomist/sdm-local/compare/0.1.17...0.1.18) - 2018-08-24

## [0.1.17](https://github.com/atomist/sdm-local/compare/0.1.16...0.1.17) - 2018-08-24

## [0.1.16](https://github.com/atomist/sdm-local/compare/0.1.15...0.1.16) - 2018-08-24

## [0.1.15](https://github.com/atomist/sdm-local/compare/0.1.14...0.1.15) - 2018-08-24

### Added

-   Actionable messages. [#4](https://github.com/atomist/sdm-local/issues/4)

### Fixed

-   Markdown rendering on the terminal is limited by performance. [#123](https://github.com/atomist/sdm-local/issues/123)

## [0.1.14](https://github.com/atomist/sdm-local/compare/0.1.13...0.1.14) - 2018-08-24

## [0.1.13](https://github.com/atomist/sdm-local/compare/0.1.12...0.1.13) - 2018-08-23

### Fixed

-   Show skills doesn’t exit. [#135](https://github.com/atomist/sdm-local/issues/135)

## [0.1.12](https://github.com/atomist/sdm-local/compare/0.1.11...0.1.12) - 2018-08-23

### Fixed

-   Eliminate slow timeout threads for requests that already returned. [#129](https://github.com/atomist/sdm-local/issues/129)

## [0.1.11](https://github.com/atomist/sdm-local/compare/0.1.10...0.1.11) - 2018-08-22

## [0.1.10](https://github.com/atomist/sdm-local/compare/0.1.9...0.1.10) - 2018-08-21

## [0.1.9](https://github.com/atomist/sdm-local/compare/0.1.8...0.1.9) - 2018-08-21

### Changed

-   Migrate to atomist git-hook, fix bugs. [#119](https://github.com/atomist/sdm-local/issues/119)
-   Update dependencies, downgrade JavaScript. [#120](https://github.com/atomist/sdm-local/issues/120)

## [0.1.8](https://github.com/atomist/sdm-local/compare/0.1.7...0.1.8) - 2018-08-20

## [0.1.7](https://github.com/atomist/sdm-local/compare/0.1.6...0.1.7) - 2018-08-19

### Changed

-   Cleanup team -> workspace. [#89](https://github.com/atomist/sdm-local/issues/89)

## [0.1.6](https://github.com/atomist/sdm-local/compare/0.1.5...0.1.6) - 2018-08-09

## [0.1.5](https://github.com/atomist/sdm-local/compare/0.1.4...0.1.5) - 2018-08-09

### Changed

-   Enable TypeScript compiler strict mode [#82](https://github.com/atomist/sdm-local/issues/82)

## [0.1.4](https://github.com/atomist/sdm-local/compare/0.1.2...0.1.3) - 2018-08-08

### Changed

-   Reorganize package to have more standard Node.js layout

## [0.1.3](https://github.com/atomist/sdm-local/compare/0.1.2...0.1.3) - 2018-08-07

## [0.1.2](https://github.com/atomist/sdm-local/compare/0.1.1...0.1.2) - 2018-08-06

## [0.1.1](https://github.com/atomist/sdm-local/compare/0.1.0...0.1.1) - 2018-08-06

### Added

-   Can provide tag when publishing NPM package [#404](https://github.com/atomist/sdm-local/issues/404)

## [0.1.0](https://github.com/atomist/sdm-local/tree/0.1.0) - 2018-05-16

### Added

-   Everything
