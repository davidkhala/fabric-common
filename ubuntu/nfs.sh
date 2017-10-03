#!/usr/bin/env bash
fcn=$1
remain_params=""
for ((i = 2; i <= "$#"; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done
setting="nfs rsize=8192,wsize=8192,timeo=14,intr,user" # https://askubuntu.com/questions/546176/nfs-partition-not-mounted-automatically-at-boot-time-anymore
fstab="/etc/fstab"
hostExports="/etc/exports"
function mount() {
	local localDIR=$1
	local nfsIP=$2
	local nfsDIR=$3
	sed -i "/${localDIR}/c $nfsIP:$nfsDIR $localDIR $setting" $fstab
}
function rm() {
	local localDIR=$1
	read -p " Continue with sed pattern \"${localDIR}\" ? (y/n)" choice
	case "$choice" in
	y | Y) sed -i "/${localDIR}/d" $fstab ;;
	n | N)
		echo Abort...
		exit 1
		;;
	*)
		echo invalid input \"$choice\"
		exit 1
		;;
	esac
}
function update() {
	rm $remain_params
	mount $remain_params
}
function installHost() {
	apt install nfs-kernel-server
}
function installClient() {
	apt install nfs-common
}
function exposeHost() {
	local localDIR=$1
	if ! grep $localDIR $hostExports; then
		echo "$localDIR	*(ro,sync,no_root_squash)" | sudo tee -a $hostExports
	fi
}
function startHost() {
	systemctl start nfs-kernel-server.service
}
$fcn $remain_params
