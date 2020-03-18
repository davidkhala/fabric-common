const {load} = require('fabric-client/lib/ProtoLoader');
const protobuf = '/home/ubuntu/Documents/delphi-fabric/common/nodejs/builder/node_modules/fabric-client/lib/protos/orderer/ab.proto'
const message =load(protobuf)

console.log(message.orderer)

