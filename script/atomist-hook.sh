#!/bin/sh

######## Atomist hook script
# Entry point for all calls
# Takes 5 arguments: JS script, git event, hook directory where the call came from,
# branch and sha

script=$1
event=$2
hookDir=$3
branch=$4
sha=$5

node $script\
    $event \
    $hookDir \
    $branch\
    $sha
