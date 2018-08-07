# fabric-common

Latest version 1.2.0
# Installation




# build environment for tag v1.1.0
**Since native build image id differnt from the ones in public docker hub, then `docker pull *` will overwrite your built images**

1. golang 1.9 install 
`./install.sh golang1_9`  
this will take effect in **new terminal**
2. docker 17.12, jq 1.5 install 
`./docker/install.sh`
3. docker composer 1.22.0
`./docker/install.sh installCompose`
4. grand current OS user to docker group
`./docker/dockerSUDO.sh` 
this will take effect in current terminal, **Logout is required for system-wide applied**
5. libtool install 
`./install.sh install_libtool` 

6. (optiaonal) build thirdpary and base images 
    
    1. get baseimage source and reset to tag `v0.4.6`  
        ```
        git clone https://github.com/hyperledger/fabric-baseimage.git
        cd fabric-baseimage
        git reset --hard v0.4.6
        ```
    2. build base images  
        `make docker`  
    It is time comsuing.
    3. build couchdb kafka zookeeper  
    `make dependent-images`  
    **TRICK: these reply on v0.4.5, which is pulled from public hub**
7. build peer, orderer images and necessary binaries from source
    1. get fabric into GOPATH and reset to tag  `v1.1.0`
    ```
    go get -u github.com/hyperledger/fabric
    cd $(go env GOPATH)/src/github.com/hyperledger/fabric
    git reset --hard v1.1.0
    ```
    2. make images
        ```
        export GOPATH=$(go env GOPATH)
        make clean-all peer-docker orderer-docker
        ```
    3. make binaries
        ```
        export GOPATH=$(go env GOPATH)
        make native
        ```
8. build ca
    1. get ca source and reset to tag `v1.1.0`  
        ```
        go get -u github.com/hyperledger/fabric-ca
        cd $(go env GOPATH)/src/github.com/hyperledger/fabric-ca
        git reset --hard v1.1.0
        ```
    2. make images
        `make clean-all rename docker-fabric-ca`
 
9. (exprerimental) unit tests failed in each section  
swallow it if OK for project