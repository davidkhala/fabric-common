# khala-fabric-admin
A way to compensate missing admin level node-sdk


## Design
- This derives from 'khala-fabric-sdk-node-builder' design
    - it depends on fabric-sdk components
    - Object-oriented
- channel operation: create, join, update
- chaincode operation: install, upgrade 

## Notes
- channel.getChannelConfig(peer) will not be rebuilt: always get it from orderer