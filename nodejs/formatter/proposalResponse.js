/**
 * @typedef {Object|Error|Client.ProposalResponse|Client.ProposalErrorResponse} ChaincodeInstallProposalResponse
 */

/**
 * @typedef {Client.ProposalResponse&ChaincodeInstallProposalResponse} ChaincodeInstallSuccess
 */

/**
 * @typedef {Client.ProposalErrorResponse&ChaincodeInstallProposalResponse} ChaincodeExistError
 * @property {integer} status
 * @property {Buffer} payload
 * @property {RemoteCharacteristics} peer
 */

/**
 * @typedef {Error&ChaincodeInstallProposalResponse} ChaincodeInstallCreatorAccessDeny
 * @property {integer} code code=2
 * @property {Metadata} metadata
 * @property {string} details "access denied: channel [] creator org [${orgMSP}]"
 */

const isPeer = (peer) => {
	if (!peer) {
		return false;
	}
	const {url, name, options} = peer;
	return typeof url === 'string' && typeof name === 'string' && typeof options === 'object';
};

class AbstractProposalResponse {
	constructor(response) {
		if (!response) {
			throw Error('empty proposal response');
		}
		this.response = response;
	}

	isError() {
		return this.response instanceof Error;
	}

}

class ChaincodeInstallProposalResponse extends AbstractProposalResponse {

	isChaincodeExistError() {
		const {isProposalResponse, status, peer, payload, message} = this.response;
		if (!this.isError() || !isPeer(peer)) {
			return false;
		}

		const messageRegExp = /^error installing chaincode code .+ exists\)$/;

		return !!isProposalResponse && status === 500 && payload.toString() === '' && !!message.match(messageRegExp);
	}

	isCreatorAccessDeny() {
		if (!this.isError()) {
			return false;
		}
		const {code, metadata, message, details} = this.response;
		const messageRegx = /^2 UNKNOWN: access denied: channel \[.*] creator org \[.+]$/;
		const detailsRegx = /^access denied: channel \[.*] creator org \[.+]$/;
		return code === 2 && metadata.constructor.name === 'Metadata' && !!message.match(messageRegx) && !!details.match(detailsRegx);
	}

	isSuccess() {
		const {version, timestamp, response, payload, endorsement, peer} = this.response;
		if (!response || this.isError() || !isPeer(peer)) {
			return false;
		}
		const {status, message, payload: responsePayload} = response;
		if (!(status === 200 && message === '' && responsePayload.toString() === 'OK')) {
			return false;
		}
		return version === 0 && timestamp === null && endorsement === null && payload.toString() === '';
	}
}

const isEndorsement = (endorsement) => {
	if (!endorsement) {
		return false;
	}
	const {endorser, signature} = endorsement;
	return endorser instanceof Buffer && signature instanceof Buffer;
};

class TransactionProposalResponse extends AbstractProposalResponse {

	isSuccess() {
		const {version, timestamp, response, payload, endorsement, peer} = this.response;
		if (this.isError() || !isPeer(peer) || !isEndorsement(endorsement)) {
			return false;
		}

		const {status, message, payload: _payload} = response;
		if (!(status === 200 && message === '' && _payload.toString() === '')) {
			return false;
		}
		return version === 1 && timestamp === null && payload instanceof Buffer;
	}

	isChaincodeNotFound() {
		const {message, status, payload, peer, isProposalResponse} = this.response;
		if (!this.isError() || !isPeer(peer)) {
			return false;
		}

		const messageRegx = /^make sure the chaincode [A-Za-z0-9_-]+ has been successfully instantiated and try again: chaincode [A-Za-z0-9_-]+ not found$/;

		return isProposalResponse === true && status === 500 && payload.toString() === '' && !!message.match(messageRegx);

	}
}

class ChaincodeProposalResponse extends AbstractProposalResponse {
	isSuccess() {
		const {version, timestamp, response, payload, endorsement, peer} = this.response;
		if (this.isError() || !isPeer(peer) || !isEndorsement(endorsement)) {
			return false;
		}
		if (!response) {
			return false;
		}

		const {status, message, payload: _payload} = response;
		if (!(status === 200 && message === '' && _payload instanceof Buffer && _payload.toString('hex').length > 0)) {
			return false;
		}
		return version === 1 && timestamp === null && payload instanceof Buffer;
	}
}


module.exports = {
	ChaincodeInstallProposalResponse,
	ChaincodeProposalResponse,
	TransactionProposalResponse
};