# khala-fabric-sdk-node
fabric-sdk-node integrated utils

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)

Component module list
---
- [builder](./builder)
- [fabric-network](./fabric-network)
- [formatter](./formatter)

## Usage
- Please import `fabric-ca-client` and `fabric-client` with matched version

## Notes
- [1.4][sdk] `Channel#getChannelConfigReadable` could be used to extract application channel from orderer
    - used in migration from kafka to RAFT. When after <appChannel> config changed to maintenance mode, peer in <appChannel> could not get the latest channel config. At that point, we could extract <appChannel> config from orderer alternatively.
- [sdk]node-gyp rebuild require `make` and `g++` 
- [sdk]FABN-1130: Stop using "init" as default function name
- Block data emitted in block event has a structure documented in [types.js](./formatter/types.js)

 
## TODO
