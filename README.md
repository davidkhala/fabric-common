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
- blockHeight(got from queryChain) indexing from 1, blockNumber in blockEvent starting from 0
- requirePeerCount <= peerCount - 1 (1 for peer itself)
- "2-of" collectionPolicy is not allowed
# DONE

# TODO
- instantiate chaincode on Mac, context canceled
- cannot disseminate privateData to non-anchor peers?
- npm couchdb-dump in nodejs/couchdbDump.sh


# Fabric weakness
- gossip timeline is outside of blockchain,  for massive data scenario, gossip will fall behind transaction event
