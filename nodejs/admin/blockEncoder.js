const fabricProtos = require('fabric-protos');
const commonProto = fabricProtos.common;


const fromEvent = ({block}) => {
	const blockHeader = new commonProto.BlockHeader();
	blockHeader.setNumber(block.header.number);
	blockHeader.setPreviousHash(block.header.previous_hash);
	blockHeader.setDataHash(block.header.data_hash);
	const blockData = new commonProto.BlockData();
	blockData.setData(block.data.data);
	const blockMetadata = new commonProto.BlockMetadata();
	blockMetadata.setMetadata(block.metadata.metadata);

	const blockEncoded = new commonProto.Block();
	blockEncoded.setHeader(blockHeader);
	blockEncoded.setData(blockData);
	blockEncoded.setMetadata(blockMetadata);
	return blockEncoded;
};
module.exports = {
	fromEvent
};