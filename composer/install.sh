#!/usr/bin/env bash

CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)
sudo chmod 777 /usr/lib/node_modules
CLI() {

    if ! composer --version; then
        set +e
        sudo npm install -g composer-cli@0.20 # special for Hyperledger/composer
        set -e
        npm install -g composer-cli@0.20 # special for Hyperledger/composer
    fi

}

restServer() {
    if ! composer-rest-server --version; then
        set +e
        sudo npm install -g composer-rest-server@0.20
        set -e
        npm install -g composer-rest-server@0.20 # special for Hyperledger/composer:
    fi

}
fabricDevServers() {
    local target=$CURRENT/fabric-dev-servers
    mkdir -p $target
    cd $target
    curl -O https://raw.githubusercontent.com/hyperledger/composer-tools/master/packages/fabric-dev-servers/fabric-dev-servers.tar.gz
    tar -xvf fabric-dev-servers.tar.gz
    rm fabric-dev-servers.tar.gz
    export FABRIC_VERSION=hlfv12
    $target/downloadFabric.sh
}
