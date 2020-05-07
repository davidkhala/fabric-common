# fabric-network: Strategy interpretation
[Reference](https://hyperledger.github.io/fabric-sdk-node/release-1.4/tutorial-transaction-commit-events.html)

- **round robin** is an arrangement of choosing all elements in a group equally in some rational order
    - Usually from the top to the bottom of a list and then starting again at the top of the list and so on.

### Query handling strategies

- `MSPID_SCOPE_SINGLE` **[default]**
    - This will evaluate all transactions on the first peer from which is can obtain a response, and only switch to another peer if this
peer fails.

- `MSPID_SCOPE_ROUND_ROBIN`
    - This will evaluate transaction on the first peer from which is can obtain a response, and switch to another peer on next evaluation as rotation

### Event handling strategies

- `MSPID_SCOPE_ALLFORTX` **[default]** 
    - Listen for transaction commit events from all peers in the **client identity's organization**.
    - `submitTransaction` will wait until successful events received from **all** currently connected peers
- `MSPID_SCOPE_ANYFORTX` 
    - Listen for transaction commit events from all peers in the **client identity's organization**.
    - `submitTransaction` will wait until a successful event received from **any** peer.
- `NETWORK_SCOPE_ALLFORTX` 
    - Listen for transaction commit events from all peers in the **network**.
    - `submitTransaction` will wait until successful events received from **all** currently connected peers
- `NETWORK_SCOPE_ANYFORTX` 
    - Listen for transaction commit events from all peers in the **network**.
    - `submitTransaction` function will wait until a successful event received from **any** peer.

### EventHub selection strategies 

- `MSPID_SCOPE_ROUND_ROBIN` 
    - Reconnect to any of the event emitting peers in the org after a disconnect occurs. 
    - Select the event hub in a 'round robin' fashion
    
### Event checkpoint strategies
    
Replaying missed chaincode events and block events emitted by peers.    
It should be used alongside existing recovery infrastructure.

- `FILE_SYSTEM_CHECKPOINTER`
    - *Disclaimer*: it is designed for Proof of Technology('PoC') only, we strongly suggest implementing `BaseCheckpointer` interface as your own checkpointer 
    - options.basePath = ~/.hlf-checkpoint/