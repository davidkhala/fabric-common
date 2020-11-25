# Notes: RAFT
- etcdraft does not support [non TLS](https://hyperledger-fabric.readthedocs.io/en/release-1.4/raft_configuration.html)
    - Raft nodes identify each other using TLS pinning, so in order to impersonate a Raft node, an attacker needs to obtain the private key of its TLS certificate. As a result, it is not possible to run a Raft node without a valid TLS configuration.
    - `[orderer.common.server] initializeClusterClientConfig -> PANI 004 TLS is required for running ordering nodes of type etcdraft.`
    - `ClientTLSCert`, `ServerTLSCert` in configtx.yaml have to be aligned with orderer environment set: 
        ```shell script
                General.Cluster.ClientCertificate = ""
                General.Cluster.ClientPrivateKey = ""
                General.Cluster.RootCAs = []
        ```
        otherwise it will say:
        ```shell script
        I do not belong to channel testchainid or am forbidden pulling it (not in the channel), skipping chain retrieval
        ```
- [solo][FAB-15754] Deploy a single-node Raft-based ordering service instead of using solo consensus type
- [channel creation] `'will not enqueue, consenter for this channel hasn\'t started yet'` will never appear as response `info` in etcdraft
    - it is a kafka legacy
