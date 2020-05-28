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
    - sideDB -> ?[TODO]
    
## Test
    - intergration test and e2e test locates in [delphi-fabric](https://github.com/davidkhala/delphi-fabric)
## Notes
- node-gyp rebuild require `make` and `g++` 
- Block data emitted in block event has a structure documented in [types.js](./formatter/types.js)
- Now User and Client is separated. Client is less usefull for most action
- `configtxlator` handler (for both CLI or server based) in `binManager.js`
- [gPRC] waitForReady will response back positive response with non-TLS protocol
    - With grpcs://domain.org setup, we could get pong response from grpc://domain.org    
## TODO
- translator for OR('Org1MSP.member', 'Org2MSP.member') <=> N out of
    - reference: `common/policydsl/policyparser.go`
        - `func FromString(policy string) (*cb.SignaturePolicyEnvelope, error)`
- tranlastor for 
```
    // collections_config.json
    
    [
      {
           "name": "collectionMarbles",
           "policy": "OR('Org1MSP.member', 'Org2MSP.member')",
           "requiredPeerCount": 0,
           "maxPeerCount": 3,
           "blockToLive":1000000,
           "memberOnlyRead": true
      },
    
      {
           "name": "collectionMarblePrivateDetails",
           "policy": "OR('Org1MSP.member')",
           "requiredPeerCount": 0,
           "maxPeerCount": 3,
           "blockToLive":3,
           "memberOnlyRead": true
      }
    ]


```