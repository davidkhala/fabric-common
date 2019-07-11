#!/usr/bin/env bash
set -x
CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)
backupDir=$CURRENT/backup/
backupDB() {
	local port=${1:-5984}
	local host=${2:-localhost}
	local protocol=${3:-http}
	if [ ! -d ${backupDir} ]; then
		mkdir -p $backupDir
	fi

	local url="$protocal://${host}:${port}/_all_dbs"
	local response=$(curl -s -X GET $url)
	if [ -z $response ]; then
		echo no response from $url
	else
		IFS=',[]""' read -ra ids <<<"$response" # IFS is the keyword
		for i in "${ids[@]}"; do
			if [ -n "$i" ]; then
				: >>$backupDir/"$i".json
				cdbdump -P $port -r $protocol -h $host -d "$i" >$backupDir/"$i".json
			fi
		done
	fi
}

loadDB() {
	local port=${1:-5984}
	local host=${2:-localhost}
	local protocol=${3:-http}
	local url="$protocal://${host}:${port}/_all_dbs"

	# local response=$(curl -s -X GET $url) # TODO: logical error here
	# for i in "${ids[@]}"; do
	# 	if [ -n "$i" ]; then
	# 		echo "$i"
	# 		cdbload -P $port -r $protocol -h $host -d "$i" <$backupDir/"$i".json
	# 	fi
	# done
}
install() {
	sudo npm install -g couchdb-dump
}
fcn=$1
remain_params=""
for ((i = 2; i <= ${#}; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done

$fcn $remain_params
