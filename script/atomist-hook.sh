#!/bin/sh

script=$1
event=$2
hookDir=$3
branch=$4
sha=$5

# branch=$(cd $hookDir && git rev-parse HEAD)
# sha=$(cd $hookDir && git rev-parse --abbrev-ref HEAD)

 echo "git hook fire: Invoking Atomist $event against $hookDir"

# curl -d  -H "Content-Type: application/json" -X POST http://127.0.0.1:6660/githook

node $script\
    $event \
    $hookDir \
    $branch\
    $sha\
    &
