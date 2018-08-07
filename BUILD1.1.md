# build ecosystem for tag v1.1.0
**Since native build image id different from the ones in public docker hub, then `docker pull *` will overwrite your built images**

1. golang 1.9 install 
`./install.sh golang1_9`  
this will take effect in **new terminal**
2. docker 17.12, jq 1.5 install 
`./docker/install.sh`
3. docker composer 1.22.0 (required for tests)
`./docker/install.sh installCompose`
4. grand current OS user to docker group
`./docker/dockerSUDO.sh` 
this will take effect in current terminal, **Logout is required for system-wide applied**
5. libtool install 
`./install.sh install_libtool` 

6. build third party and base images 
    
    1. get baseimage source and reset to tag `v0.4.6`  
        ```
        git clone https://github.com/hyperledger/fabric-baseimage.git
        cd fabric-baseimage
        git reset --hard v0.4.6
        ```
    2. clean build  
        `make clean`
    2. build base images **This rely on ubuntu image (from internet)**  
        `make docker`  
    It is time consuming (about 20 minutes)
    3. build couchdb kafka zookeeper (about 4 minutes) **TRICK: these rely on baseimage-v0.4.5 (from internet)**  
        `make dependent-images`  
    
7. build peer, orderer, ccenv images and configtxgen binary from source
    1. get fabric into GOPATH and reset to tag  `v1.1.0`
    ```
    go get -u github.com/hyperledger/fabric
    cd $(go env GOPATH)/src/github.com/hyperledger/fabric
    git reset --hard v1.1.0
    ```
    2. clean build  
        ```
        export GOPATH=$(go env GOPATH)
        make clean-all
        ```
    2. make images (3 minutes)
        ```
        export GOPATH=$(go env GOPATH)
        make peer-docker orderer-docker
        ```
        `peer-docker` depend on `ccenv`
    3. make configtxgen binary
        ```
        export GOPATH=$(go env GOPATH)
        make configtxgen
        ```
        - Binary available as build/bin/configtxgen
8. build ca
    1. get ca source and reset to tag `v1.1.0`  
        ```
        go get -u github.com/hyperledger/fabric-ca
        cd $(go env GOPATH)/src/github.com/hyperledger/fabric-ca
        git reset --hard v1.1.0
        ```
    2. make images
        `make clean-all rename docker-fabric-ca`
 
9. (experimental) unit tests failed in each section  
swallow it if OK for project