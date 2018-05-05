exports.envBuilder = (MY_ID,allIDs)=>{
	let ZOO_SERVERS = `ZOO_SERVERS=${allIDs.map(id=>`server.${id}=0.0.0.0:2888:3888`).join(' ')}`;
	return [`ZOO_MY_ID=${MY_ID}`,ZOO_SERVERS];
};