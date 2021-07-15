const BufferFrom = (protobufMessage, asType = protobufMessage.constructor) => asType.encode(protobufMessage).finish();

module.exports = {
	BufferFrom,
	ProtoFrom: (object, asType) => asType.fromObject(object)
};
