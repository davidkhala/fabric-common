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
    - Orderer => Committer
    - Peer => Discoverer | Endorser | Eventer
    - EventHub => EventService
    - Client._userContext => IdentityContext
    - sideDB -> ?[TODO]
## Notes
- [sdk]node-gyp rebuild require `make` and `g++` 
- Block data emitted in block event has a structure documented in [types.js](./formatter/types.js)
- Now User and Client is separated.    
- `configtxlator` handler in `nodejs/binManager.js`
 
## TODO
