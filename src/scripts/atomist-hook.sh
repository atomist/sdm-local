#!/bin/sh

######## Atomist hook script
# Entry point for all calls
# Takes 5 arguments: JS script, git event, hook directory where the call came from,
# branch and sha

# Set ATOMIST_GITHOOK_VERBOSE to "true" to get verbose output

script=$1
event=$2
hookDir=$3
branch=$4
sha=$5

# Uncomment for debugging
# ATOMIST_GITHOOK_VERBOSE="true"

case "$ATOMIST_GITHOOK_VERBOSE" in
 true)
    node $script\
       $event \
       $hookDir \
       $branch\
       $sha \
    ;;
 *)
    node $script\
           $event \
           $hookDir \
           $branch\
           $sha \
           &>/dev/null &
        ;;
esac
