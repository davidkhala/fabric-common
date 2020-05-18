# khala-fabric-admin
A way to compensate missing admin level node-sdk


## Design
- This derives from 'khala-fabric-sdk-node-builder' design
    - it depends on fabric-sdk components
    - Object-oriented
- [DONE] channel operation: create, join, update
- [TODO:WIP] chaincode operation: package, install, Approve, define, upgrade 


## Notes
- channel.getChannelConfig(peer) will not be rebuilt: always get it from orderer
