# fabric-ca-client

## `fabric-ca-client enroll`
The command will generate material into be below tree structure 

```
<root path specified in `--mspdir`>
├── cacerts
├── IssuerPublicKey
├── IssuerRevocationPublicKey
├── keystore
│   └── 8e95d63c2d6bff9c492b2911bd8f6ddec81defb2e23b03414f38f09cc3d4bb8e_sk
├── signcerts
│   └── cert.pem
├── tlscacerts
│   └── tls-<replace target domain dot by hyphen>-${port in url}.pem
└── user
```
