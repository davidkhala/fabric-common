#!/usr/bin/env bash
fcn=$1
function dep(){
    brew install dep
}
function jq(){
    brew install jq
}
function go(){
    brew install go
}
function gerrit(){
    brew install git-review
}
function libtool(){
    brew install libtool
}
$fcn
