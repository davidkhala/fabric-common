//Kafka "rule": "1<M<N<K,K>=4,Orderer.AbsoluteMaxBytes < replica.fetch.max.bytes <= message.max.bytes",
exports.envBuilder = ({N, M, BROKER_ID}, zookeeperHostnames) => {

	const KAFKA_ZOOKEEPER_CONNECT = `KAFKA_ZOOKEEPER_CONNECT=${zookeeperHostnames.map(zookeeper => `${zookeeper}:2181`).join()}`;
	const environment = [
		`KAFKA_BROKER_ID=${BROKER_ID}`,
		KAFKA_ZOOKEEPER_CONNECT,
		'KAFKA_LOG_RETENTION_MS=-1',
		'KAFKA_MESSAGE_MAX_BYTES=103809024',//NOTE cannot be in format of 10 MB
		'KAFKA_REPLICA_FETCH_MAX_BYTES=103809024',//NOTE cannot be in format of 10 MB
		'KAFKA_UNCLEAN_LEADER_ELECTION_ENABLE=false',
		`KAFKA_DEFAULT_REPLICATION_FACTOR=${N}`,
		`KAFKA_MIN_INSYNC_REPLICAS=${M}`
	];
	return environment;
};