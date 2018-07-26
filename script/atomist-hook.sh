#!/bin/sh

script=$1
hookDir=$3
event=$2

branch=$(git rev-parse HEAD)
sha=$(git rev-parse --abbrev-ref HEAD)

# echo "git hook fire: Invoking Atomist $event against $hookDir"

# curl -d  -H "Content-Type: application/json" -X POST http://127.0.0.1:6660/githook

node $script\
    $event \
    $hookDir \
    $sha\
    $branch\
    &
