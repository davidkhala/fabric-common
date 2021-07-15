const fabprotos = require('fabric-protos');
const {ProtoFrom, BufferFrom} = require('khala-fabric-formatter/protobuf');
const commonProto = fabprotos.common;


const fromEvent = ({block}, asBuffer) => {
	const blockHeader = new commonProto.BlockHeader();
	blockHeader.number = block.header.number;
	blockHeader.previous_hash = block.header.previous_hash;
	blockHeader.data_hash = block.header.data_hash;
	const blockData = new commonProto.BlockData();
	blockData.data = block.data.data;
	const blockMetadata = new commonProto.BlockMetadata();
	blockMetadata.metadata = block.metadata.metadata;

	const blockEncoded = ProtoFrom({header: blockHeader, data: blockData, metadata: blockMetadata}, commonProto.Block);
	if (asBuffer) {
		return BufferFrom(blockEncoded, commonProto.Block);
	}
	return blockEncoded;
};
module.exports = {
	fromEvent
};
