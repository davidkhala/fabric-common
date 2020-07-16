# khala-fabric-sdk-node
fabric-sdk-node integrated utils

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)

Component module list
---
- [admin](./admin)
- [fabric-network](./fabric-network)
- [formatter](./formatter)

## Design Notes
- Concept map:
    - Orderer => Committer | Eventer*
    - Peer => Discoverer | Endorser | Eventer
    - EventHub => EventService
    - Client._userContext => IdentityContext
    - sideDB, policy => deprecated
    
## Test
    - intergration test and e2e test locates in [delphi-fabric](https://github.com/davidkhala/delphi-fabric)
## Notes
- node-gyp rebuild require `make` and `g++` 
- Block data emitted in block event has a structure documented in [types.js](./formatter/types.js)
- Now User and Client is separated. Client is less useful for most actions.
- `configtxlator` handler (for both CLI or server based) in `binManager.js`
- [gPRC] waitForReady will response back positive response with non-TLS protocol
    - With grpcs://domain.org setup, we could get pong response from grpc://domain.org
- proposal response `.responses.map(({connection})=>connection)` could label each response with Endorser detail
- configtxlator Rest server is deprecated but kept in `BinManger` 
      ```
        const binManager = new BinManager();
        await binManager.configtxlatorRESTServer('down|start');
      ```
- [collection-level-endorsement-policies](https://hyperledger-fabric.readthedocs.io/en/master/endorsement-policies.html#setting-collection-level-endorsement-policies)
    - If a collection-level endorsement policy is set, transactions that write to a private data collection key will require that the specified organization peers have endorsed the transaction.
    - The collection-level endorsement policy may be less restrictive or more restrictive than the chaincode-level endorsement policy and the collection’s private data distribution policy.      
## TODO
- idemix for sdk-node: https://lists.hyperledger.org/g/fabric/message/6625
## Fabric weakness
- Does not support multiple stream managed in single EventService even with multiple targets configured
    - Only single `eventService._current_eventer` take effect
    - `_current_eventer` is set from either one workable target
