# khala-fabric-network
util for fabric-network

# Notes
- InMemoryWallet will be shared across all instance of a memory wallet, so really an app should only have one instance.
    - If you put 2 different identities with the same label it will overwrite the existing one.
- gateway: mspid is required when enabled discovery
    - No peers defined for MSP 'null' to discover from 

## [About strategy](./STRATEGY.md)


