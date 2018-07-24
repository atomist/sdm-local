# Slalom: Local Software Delivery Machine

A software delivery machine is a program that understands code and delivery flows. Further description is in the Atomist sdm project and in Rod Johnson's blog [Why you need a Software Delivery Machine](https://the-composition.com/why-you-need-a-software-delivery-machine-85e8399cdfc0). This [video](https://vimeo.com/260496136) shows an SDM in action.


The blogs and videos show an SDM that connects to Atomist's cloud service. This repository contains a *local* software delivery machine that works on your development machine and responds to your commits, performing whatever actions you decide
should happen in response to new code. 

> This project is purely
open source and can be used without the
Atomist service. However, the code you write it can
run unchanged to benefit your entire team if you do
connect to the Atomist service, as the `SoftwareDeliveryMachine` API is identical between local and cloud SDMs.

You customize an SDM to work with the code 
you care about: fix formatting errors (with commits), perform code reviews, run tests, publish artifacts, etc.


It also responds to your commands: to create new projects, edit code in existing projects, or other actions
you program into it.

The instructions here will take you through 

   * Initializing your local SDM
   * Seeing it react to a push
      * then changing how it reacts to your push
   * Creating a new project with a generator
      * then changing it to work from a project of your choice
   * Changing code with an editor
      * then making your own code editor
   * Running a command
      * then making your own commands

Later, when they've proven useful, you can elevate your push reactions, generators, editors, 
and commands into the cloud for your whole team to use with [Atomist](www.atomist.com).

## Setup

The SDM works on projects that are `git` repositories.

To find projects on your filesystem, the SDM looks in directories group by owner (on GitHub, the owner is an organization
or user; on BitBucket, the owner is a user or a BitBucket Project), and it looks for each owner directory
 under one parent directory.

The directory structure looks like this:

```
$SDM_PROJECTS_ROOT
├── owner1
│   ├── repo1
│   └── repo2
└── owner2
    ├── repo3
    └── repo4

``` 

### Environment
Set the following environment variable:

```
ATOMIST_MODE=local
```

Put in the local post processor in `atomist.config.ts`

There are two things to do:

```typescript
postProcessors: [
    supportLocal(Config),//  <---- add this
    ...
],

```

Add the following extension pack to your SDM

```typescript
sdm.addExtensionPacks(LocalLifecycle);
```



Start your automation client normally, with the `atomist` command

### Listening to messages

Messages will come to the command line in a local invocation.

In the case of events, you can set up a listener as follows:

```
slalom listen

```

Such a listener will display messages from all local SDM activity.

### Download and install

Clone this project.

From the SDM base directory (where you have cloned the project), run the following commands:

```
npm install
npm run build
npm link
```

First, `npm install` brings down this project's dependencies.
Then, `npm run build` compiles the TypeScript into JavaScript.
Finally, `npm link` makes this project's cli tool, `slalom`, available globally.
It is also available under the `@atomist` alias.

### Configure Existing Projects

If you already have repositories cloned under your $SDM_PROJECTS_ROOT, configure them to activate the local SDM
on commit.

Add the Atomist git hook to the existing git projects within this directory structure by 
running the following command:

```
slalom add-git-hooks
```

Success will result in output like the following:

```==> slalom add-git-hooks
2018-06-06T11:23:58.003Z [m:85087] [info ] Adding extension pack 'WellKnownGoals' version 0.1.0 from Atomist
2018-06-06T11:23:58.051Z [m:85087] [info ] Searching under child directory [spring-team] of /Users/rodjohnson/temp/local-sdm
2018-06-06T11:23:58.052Z [m:85087] [info ] Searching under child directory [undefined] of /Users/rodjohnson/temp/local-sdm
2018-06-06T11:23:58.053Z [m:85087] [info ] Searching under child directory [x] of /Users/rodjohnson/temp/local-sdm
2018-06-06T11:23:58.074Z [m:85087] [info ] addGitHooks: Adding git post-commit script to project at /Users/rodjohnson/temp/local-sdm/spring-team/danger-mouse
2018-06-06T11:23:58.076Z [m:85087] [info ] addGitHooks: Adding git post-commit script to project at /Users/rodjohnson/temp/local-sdm/spring-team/fiddlesticks
2018-06-06T11:23:58.077Z [m:85087] [info ] addGitHooks: Adding git post-commit script to project at /Users/rodjohnson/temp/local-sdm/spring-team/foo
2018-06-06T11:23:58.078Z [m:85087] [info ] addGitHooks: Adding git post-commit script to project at /Users/rodjohnson/temp/local-sdm/spring-team/losgatos1
2018-06-06T11:23:58.079Z [m:85087] [info ] addGitHooks: Adding git post-commit script to project at /Users/rodjohnson/temp/local-sdm/spring-team/spring-rest-seed
2018-06-06T11:23:58.080Z [m:85087] [info ] addGitHooks: Adding git post-commit script to project at /Users/rodjohnson/temp/local-sdm/x/y
```

> Running `slalom add-git-hooks` is only necessary for pre-existing cloned directories and directories that are cloned using `git` rather than the local SDM.

## Reacting to commits

A software delivery machine reacts to code changes. For instance, when you commit to a Spring Boot application, it can 
start the app up locally, while running tests.
When you commit to a Node library, it can publish a snapshot to npm, while running tests, and while fixing any formatting
errors and performing automated code review and identifying sensitive changes.

Make a commit in any repository within $SDM_PROJECTS_ROOT, and the SDM will run immediately. 

Commits to managed repos generate Atomist *push* events.

# Adding to your SDM

> The API is identical to the API of a cloud-connected Atomist SDM.

## Adding projects
Further projects can be added under the expanded directory tree in three ways:

### Normal git Clone

Cloning any git project from anywhere under `$SDM_PROJECTS_BASE` and running `slalom add-git-hooks` to add git hooks to it.

### Symbolic Link
Go to the correct organization directory, creating it if necessary. Then create a symlink to the required directory elsewhere on your machine. For example:

```
ln -s /Users/rodjohnson/sforzando-dev/idea-projects/flight1
```
Then run `slalom add-git-hooks` and the linked project will be treatd as a normal project.

### Import Command

The easiest way to add an existing project to your SDM projects is: run the `import` command to clone a 
GitHub.com repository in the right place in the expanded tree and automatically
 install the git hook:

```
slalom import --owner=johnsonr --repo=initializr

```

Output will look as follows:

```
018-06-06T11:27:27.068Z [m:85220] [info ] Adding extension pack 'WellKnownGoals' version 0.1.0 from Atomist
2018-06-06T11:27:27.116Z [m:85220] [info ] Adding GitHub project johnsonr/initializr
Cloning into 'initializr'...
warning: redirecting to https://github.com/johnsonr/initializr/
2018-06-06T11:27:33.349Z [m:85220] [info ] addGitHooks: Adding git post-commit script to project at /Users/rodjohnson/temp/local-sdm/johnsonr/initializr
```

Only public repos are supported.

## Running Commands
```
slalom show skills
```

Type in intents as follows:

```
slalom create spring
```

No parameters beyond the command name are required. However, command-specific parameters may be provided in options syntax.

## Advanced Setup

### Mapped Parameters and Secrets
Environment variables

- `SLACK_TEAM`
- `SLACK_USER_NAME`


## Roadmap

- Depend only on `sdm-api` project. This will require it to be split out and `automation-client` to be split to pull out the Project API, which is part of the SDM API.
- Decide how to get build results from external tools in (if we wish to)

