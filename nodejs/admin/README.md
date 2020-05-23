# khala-fabric-admin
A way to compensate missing admin level node-sdk


## Design
- This derives from 'khala-fabric-sdk-node-builder' design
    - it depends on fabric-sdk components
    - Object-oriented
- [DONE] channel operation: create, join, update
- [DONE] chaincode operation: package, install
- chaincode operation: Approve, commitDefine, upgrade[WIP] 


## Notes
- channel.getChannelConfig(peer) will not be rebuilt: always get it from orderer

## Entry Points
### Channel create

Channel create is same as channel update action
- See in `channelUpdate.js`, you could use a single envelop or config along with signatures
    as channel configuration content. 


### Channel join
peer joining to a channel in nature is sending a system chaincode proposal to peers
- See in `CSCCProposal.js`, you could extract the genesis block data from a file,    
- Or you could use method `getSpecificBlock` in `signingIdentity.js` to get genesis block from orderer

### Channel Update


### Chaincode Package 
   
