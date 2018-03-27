#!/usr/bin/env bash
fcn=$1
remain_params=""
for ((i = 2; i <= $#; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done
# setting="nfs defaults 0 0"
setting="nfs rsize=8192,wsize=8192,timeo=14,intr,user" # https://askubuntu.com/questions/546176/nfs-partition-not-mounted-automatically-at-boot-time-anymore
fstab="/etc/fstab"
hostExports="/etc/exports"
function mountClient() {
	local localDIR=$1
	local nfsIP=$2
	local nfsDIR=$3
	if grep "$nfsIP:$nfsDIR" $fstab; then
		read -p " found $nfsIP:$nfsDIR on $fstab , Do you want to replace with <$nfsIP:$nfsDIR $localDIR $setting>? (y/n)" choice
		case "$choice" in
		y | Y) sed -i "\|${localDIR}|c $nfsIP:$nfsDIR $localDIR $setting" $fstab ;;
		n | N)
			echo Abort...
			exit 1
			;;
		*)
			echo invalid input \"$choice\"
			exit 1
			;;
		esac
	else
		echo "$nfsIP:$nfsDIR $localDIR $setting" >>$fstab
	fi
}
function rmMountedClient() {
	local localDIR=$1
	read -p " Continue with sed pattern \"${localDIR}\" on $fstab ? (y/n)" choice
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
function updateMountedClient() {
	rmMountedClient $remain_params
	mountClient $remain_params
}
function installHost() {
	sudo apt install -y nfs-kernel-server
}
function installClient() {
	sudo apt install -y nfs-common
}
function exposeHost() {
	local localDIR=$1
	if ! grep $localDIR $hostExports; then
		echo "$localDIR	*(ro,sync,no_root_squash)" | sudo tee -a $hostExports
	fi
}
function rmExposedHost() {
	local localDIR=$1
	read -p " Continue with sed pattern \"${localDIR}\" on $hostExports ? (y/n)" choice
	case "$choice" in
	y | Y) sed -i "/${localDIR}/d" $hostExports ;;
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
function startHost() {
	#	systemctl start nfs-kernel-server.service?
	/etc/init.d/nfs-kernel-server restart
}
$fcn $remain_params
