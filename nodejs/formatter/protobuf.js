const toBufferCompatibleApply = (protobufMessage) => {
	protobufMessage.toBuffer = () => {
		return protobufMessage.prototype.encode(protobufMessage).finish();
	};
};
module.exports = {
	toBufferCompatibleApply
};
