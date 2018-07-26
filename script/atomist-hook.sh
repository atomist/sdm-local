#!/bin/sh

script=$1
event=$2
hookDir=$3
branch=$4
sha=$5

node $script\
    $event \
    $hookDir \
    $branch\
    $sha\
    &
