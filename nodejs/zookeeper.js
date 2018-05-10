exports.envBuilder = (MY_ID, zookeepersConfig, swarm) => {
	const ZOO_SERVERS = [];
	for (const zookeeper in zookeepersConfig) {
		const {MY_ID: id} = zookeepersConfig[zookeeper];
		ZOO_SERVERS.push(`server.${id}=${swarm && (id === MY_ID) ? '0.0.0.0' : zookeeper}:2888:3888`);
	}
	return [`ZOO_MY_ID=${MY_ID}`, `ZOO_SERVERS=${ZOO_SERVERS.join(' ')}`];
};