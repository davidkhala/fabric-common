# Notes: Chaincode

- transient map context keep persistent when cross chaincode
- chaincode name is not a secret, we can use combination of discovery service and query chaincode installed on peer to get them all
- [nodejs] nodejs chaincode take longer time in install chaincode only.
- [nodejs][contract-api] later contract in `index#exports.contracts` array will overlap to previous one, similar as `Object.assign()`
- [nodejs][contract-api] multiple contract in index.js: for invoke function code split
    - contract name: defined in subclass of Contract constructor
        ``` super(`${contractName}`) ```
    - function namespace division: <contract name>:<function name>
    - ledger data is integral for multiple contract  
- call `await stub.putPrivateData('anyCollection', "key", 'value');` without setup collection Config:  
    `Error: collection config not define for namespace` 
    See in [commit](https://github.com/hyperledger/fabric/commit/8a705b75070b7a7021ec6f897a80898abf6a1e45)
- [golang] `failed to invoke chaincode name:"lscc" , error: API error (400): OCI runtime create failed: container_linux.go:348: starting container process caused "exec: \"chaincode\": executable file not found in $PATH": unknown`
    - means package name for golang-chaincode entrance is not `main`
- [system] System chaincodes are intended to be invoked by a client rather than by a user chaincode. 
    - Invoking from a user chaincode may cause deadlocks. [See here](https://jira.hyperledger.org/browse/FAB-15285) 
- chaincode package label could be arbitrary
    - `It is not necessary for organizations to use the same package label.`
- chaincode package identifier is `${package label}:${hash of the package with nonce}`         


## TODO
- [nodejs][FAB-9287] devDependencies and offline chaincode instantiate is not supported yet
-  Currently, the chaincode as an external service model is supported by Go chaincode shim and Node.js chaincode shim. 
    - See in [FAB-18041](https://github.com/hyperledger/fabric/commit/ba9eaff56adbceb609db153577f46e3d10f6c74b)
