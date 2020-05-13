const fabprotos = require('fabric-protos');
const {BlockNumberFilterType: {NEWEST, OLDEST}} = require('khala-fabric-formatter/eventHub');
const commonProto = fabprotos.common;
const ordererProto = fabprotos.orderer;
const buildCurrentTimestamp = () => {
	const now = new Date();
	const timestamp = new fabprotos.google.protobuf.Timestamp();
	timestamp.setSeconds(now.getTime() / 1000);
	timestamp.setNanos((now.getTime() % 1000) * 1000000);
	return timestamp;
};
/**
 *
 * @param Type
 * @param Version
 * @param ChannelId
 * @param TxId
 * @param [ChaincodeID]
 * @param [TLSCertHash]
 * @param [Timestamp]
 */
const buildChannelHeader = ({Type, Version, ChannelId, TxId, ChaincodeID, TLSCertHash, Timestamp}) => {
	const channelHeader = new commonProto.ChannelHeader();
	channelHeader.setType(Type); // int32
	channelHeader.setVersion(Version); // int32

	channelHeader.setChannelId(ChannelId); // string
	channelHeader.setTxId(TxId); // string
	// 	channelHeader.setEpoch(epoch); // uint64


	const headerExt = new fabprotos.protos.ChaincodeHeaderExtension();
	if (ChaincodeID) {
		const chaincodeID = new fabprotos.protos.ChaincodeID();
		chaincodeID.setName(ChaincodeID);
		headerExt.setChaincodeId(chaincodeID);
	}

	channelHeader.setExtension(headerExt.toBuffer());
	channelHeader.setTimestamp(Timestamp || buildCurrentTimestamp()); // google.protobuf.Timestamp
	if (TLSCertHash) {
		channelHeader.setTlsCertHash(TLSCertHash);
	}


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
/**
 *
 * @param {commonProto.Header} Header
 * @param {Buffer} Data
 * @return {commonProto.Payload}
 */
const buildPayload = ({Header, Data}) => {
	const payload = new commonProto.Payload();
	payload.setHeader(Header);
	payload.setData(Data);
	return payload;
};
/**
 *
 * @param {number|BlockNumberFilterType} heightFilter
 * @return {ordererProto.SeekPosition}
 */
const buildSeekPosition = (heightFilter) => {
	const seekPosition = new ordererProto.SeekPosition();

	switch (typeof heightFilter) {
		case 'number': {
			const seekSpecified = new ordererProto.SeekSpecified();
			seekSpecified.setNumber(heightFilter);
			seekPosition.setSpecified(seekSpecified);
		}
			break;
		case 'string':
			switch (heightFilter) {
				case NEWEST: {
					const seekNewest = new fabprotos.orderer.SeekNewest();
					seekPosition.setNewest(seekNewest);
				}
					break;
				case OLDEST: {
					const seekOldest = new ordererProto.SeekOldest();
					seekPosition.setOldest(seekOldest);
				}
					break;
			}
			break;
	}
	return seekPosition;
};
/**
 * @enum {string}
 */
const SeekBehavior = {
	BLOCK_UNTIL_READY: 'BLOCK_UNTIL_READY',
	FAIL_IF_NOT_READY: 'FAIL_IF_NOT_READY',
};
/**
 *
 * @param {ordererProto.SeekPosition} startSeekPosition
 * @param {ordererProto.SeekPosition} stopSeekPosition
 * @param {SeekBehavior|string} [behavior]
 */
const buildSeekInfo = (startSeekPosition, stopSeekPosition, behavior) => {
	const seekInfo = new ordererProto.SeekInfo();
	seekInfo.setStart(startSeekPosition);
	seekInfo.setStop(stopSeekPosition);
	if (behavior) {
		seekInfo.setBehavior(ordererProto.SeekInfo.SeekBehavior[behavior]);
	}
	return seekInfo;
};

/**
 * @enum {number}
 */
const HeaderType = {
	MESSAGE: 0,                     // Used for messages which are signed but opaque
	CONFIG: 1,                      // Used for messages which express the channel config
	CONFIG_UPDATE: 2,               // Used for transactions which update the channel config
	ENDORSER_TRANSACTION: 3,        // Used by the SDK to submit endorser based transactions
	ORDERER_TRANSACTION: 4,         // Used internally by the orderer for management
	DELIVER_SEEK_INFO: 5,          // Used as the type for Envelope messages submitted to instruct the Deliver API to seek
	CHAINCODE_PACKAGE: 6,           // Used for packaging chaincode artifacts for install
	PEER_ADMIN_OPERATION: 8,        // Used for invoking an administrative operation on a peer
};

/**
 *
 * @param Creator
 * @param Nonce
 * @param ChannelId
 * @param TxId
 * @param startHeight
 * @param stopHeight
 * @return {commonProto.Payload}
 */
const buildSeekPayload = ({Creator, Nonce, ChannelId, TxId}, startHeight, stopHeight) => {

	const startPosition = buildSeekPosition(startHeight);
	const stopPosition = buildSeekPosition(stopHeight);
	const seekInfo = buildSeekInfo(startPosition, stopPosition, SeekBehavior.BLOCK_UNTIL_READY); // TODO attempt to play with another behavior


	// build the header for use with the seekInfo payload
	const seekInfoHeader = buildChannelHeader({
		Type: HeaderType.DELIVER_SEEK_INFO,
		Version: 1,
		ChannelId,
		TxId,
	});

	const seekHeader = buildHeader({Creator, Nonce, ChannelHeader: seekInfoHeader});

	const seekPayload = buildPayload({Header: seekHeader, Data: seekInfo.toBuffer()});
	return seekPayload;

};


module.exports = {
	buildChannelHeader,
	buildCurrentTimestamp,
	buildHeader,
	buildSignatureHeader,
	buildPayload,
	buildSeekPosition,
	buildSeekInfo,
	buildSeekPayload,
	SeekBehavior,
};