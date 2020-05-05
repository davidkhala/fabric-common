# Notes: Chaincode

- [chaincode]peer.response in chaincode.Init cannot be recovered from proposal response. stub.GetState is meaningless in Init 
- [chaincode]transient map context keep persistent when cross chaincode
- [chaincode]it is allowed that chaincode invoker `creator`, target peers belongs to differed organization.
- [chaincode]chaincode name is not a secret, we can use combination of discovery service and query chaincode installed on peer to get them all
- [chaincode]chaincode upgrade could not replace instantiate for fabric-sdk-node: ` Error: could not find chaincode with name 'diagnose'`
- [chaincode][nodejs]nodejs chaincode take longer time in install chaincode only.
- [chaincode][nodejs][FAB-9287] devDependencies and offline chaincode instantiate is not supported yet
- [chaincode][nodejs][contract-api] later contract in `index#exports.contracts` array will overlap to previous one, similar as `Object.assign()`
- [chaincode][nodejs][contract-api] multiple contract in index.js: for invoke function code split
    - contract name: defined in subclass of Contract constructor
        ``` super(`${contractName}`) ```
    - function namespace division: <contract name>:<function name>
    - ledger data is integral for multiple contract  
- [chaincode][nodejs][contract-api] minimum package.json
    ```json
  {
      "main": "index.js", 
      "scripts": {
          "start": "fabric-chaincode-node start"
      },
      "dependencies": {
          "fabric-contract-api": "^1.4.4",
          "fabric-shim": "^1.4.4"
      }
  }    
    ```
    property "name", "version" is useless
       
- [chaincode] call `await stub.putPrivateData('anyCollection', "key", 'value');` without setup collection Config or in Init step:  
    `Error: collection config not define for namespace` 
    See in https://github.com/hyperledger/fabric/commit/8a705b75070b7a7021ec6f897a80898abf6a1e45
- [chaincode][system]System chaincodes are intended to be invoked by a client rather than by a user chaincode
- [chaincode][golang] `failed to invoke chaincode name:"lscc" , error: API error (400): OCI runtime create failed: container_linux.go:348: starting container process caused "exec: \"chaincode\": executable file not found in $PATH": unknown`
    - means package name for golang-chaincode entrance is not `main`
- [chaincode][endorsement]chaincode partial update: when not all peers upgrade to latest chaincode, is it possible that old chaincode still work
      with inappropriate endorsement config; while with appropriate endorsement policy, we get chaincode fingerprint mismatch error
- [chaincode][system] System chaincodes are intended to be invoked by a client rather than by a user chaincode. Invoking from a user chaincode may cause deadlocks.
    [See here](https://jira.hyperledger.org/browse/FAB-15285) 
- [chaincode][instantiate policy]
    - `instantiate policy` is not `endorsemnet policy`, it is used during chaincode packaging/install determining who is able
 to instantiate/upgrade chaincode, it is partially supported in nodejs with chaincode package binary(byte[]) as input. 
    - to customize instantiate policy, we reply on `peer chaincode package` 