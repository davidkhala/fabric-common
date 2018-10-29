# fabric-common

Latest version 1.3.0
# Installation
- init submodule  
    `./install gitSync`



# build v1.1.0
see [Build 1.1](./BUILD1.1.md)

# Notes

- `failed to invoke chaincode name:"lscc" , error: API error (400): OCI runtime create failed: container_linux.go:348: starting container process caused "exec: \"chaincode\": executable file not found in $PATH": unknown`
    - means package name for golang-chaincode entrance is not `main`   

# DONE
- fabric-sdk-node: add timeStamp for default winston logger

# TODO
- instantiate chaincode on Mac, context canceled
- migrate into common nodejs modules without fabric context
    - winston logger
    - other helper
    - model: KVDBInterface, other API define  

# Fabric weakness
- gossip timeline is outside of blockchain,  for massive data scenario, gossip will fall behind transaction event  