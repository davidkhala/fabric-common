const fabprotos = require('fabric-protos');
const commonProto = fabprotos.common;
const buildCurrentTimestamp = () => {
	const now = new Date();
	const timestamp = new fabprotos.google.protobuf.Timestamp();
	timestamp.setSeconds(now.getTime() / 1000);
	timestamp.setNanos((now.getTime() % 1000) * 1000000);
	return timestamp;
};
const buildChannelHeader = ({Type, Version, ChannelId, TxId, ChaincodeID, TLSCertHash, Timestamp}) => {
	const channelHeader = new commonProto.ChannelHeader();
	channelHeader.setType(Type); // int32
	channelHeader.setVersion(Version); // int32

	channelHeader.setChannelId(ChannelId); // string
	channelHeader.setTxId(TxId); // string
	// 	channelHeader.setEpoch(epoch); // uint64

	const chaincodeID = new fabprotos.protos.ChaincodeID();
	chaincodeID.setName(ChaincodeID);

	const headerExt = new fabprotos.protos.ChaincodeHeaderExtension();
	headerExt.setChaincodeId(ChaincodeID);

	channelHeader.setExtension(headerExt.toBuffer());
	channelHeader.setTimestamp(Timestamp || buildCurrentTimestamp()); // google.protobuf.Timestamp
	channelHeader.setTlsCertHash(TLSCertHash);

	return channelHeader;
};

/**
 *
 * @param Creator from Identity.js#serialize
 * @param Nonce from 'fabric-common/lib/Util.js#getNonce'
 */
const buildSignatureHeader = ({Creator, Nonce}) => {
	const signatureHeader = new commonProto.SignatureHeader();
	signatureHeader.setCreator(Creator);
	signatureHeader.setNonce(Nonce);
	return signatureHeader;
};
/**
 *
 * @param Creator
 * @param Nonce
 * @param ChannelHeader
 */
const buildHeader = ({Creator, Nonce, ChannelHeader}) => {
	const signatureHeader = buildSignatureHeader({Creator, Nonce});

	const header = new commonProto.Header();
	header.setSignatureHeader(signatureHeader.toBuffer());
	header.setChannelHeader(ChannelHeader.toBuffer());

	return header;
};
const buildPayload = ({Header}, data) => {
	const payload = new commonProto.Payload();
	payload.setHeader(Header);
	payload.setData(data.toBuffer());
	return payload.toBuffer();
};
/**
 * TODO could be used in response from orderer.sendDeliver
 * @param {Object} block
 * @return {commonProto.Block}
 */
const buildBlock = (block) => {
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
	buildChannelHeader,
	buildCurrentTimestamp,
	buildHeader,
	buildSignatureHeader,
	buildPayload,
	buildBlock
};