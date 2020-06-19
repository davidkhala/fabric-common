set -e
## This is designed to simulate azure pipeline behavior before npm test

curl https://raw.githubusercontent.com/hyperledger/fabric-sdk-node/master/test/ts-fixtures/hsm/softhsm2.conf >> softhsm2.conf
export SOFTHSM2_CONF=softhsm2.conf
export FABRIC_VERSION=2.1
sudo apt-get install -y softhsm2
softhsm2-util --init-token --slot 0 --label "ForFabric" --pin 98765432 --so-pin 1234
npm install
npm run installAndGenerateCerts
npm run pullFabricImages
