const fabprotos = require('fabric-protos');
const commonProto = fabprotos.common;


const fromEvent = ({block}) => {
	const blockHeader = new commonProto.BlockHeader();
	blockHeader.number = block.header.number;
	blockHeader.previous_hash = block.header.previous_hash;
	blockHeader.data_hash = block.header.data_hash;
	const blockData = new commonProto.BlockData();
	blockData.data = block.data.data;
	const blockMetadata = new commonProto.BlockMetadata();
	blockMetadata.metadata = block.metadata.metadata;

	const blockEncoded = new commonProto.Block();
	blockEncoded.header = blockHeader;
	blockEncoded.data = blockData;
	blockEncoded.metadata = blockMetadata;
	return blockEncoded;
};
module.exports = {
	fromEvent
};
