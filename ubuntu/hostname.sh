#!/usr/bin/env bash
fcn="$1"
remain_params=""
for ((i = 2; i <= "$#"; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done
function change() {

	local oldHostName=$(hostname)
	local newHostName=$1
	read -p " change hostname from \"${oldHostName}\" to \"${newHostName}\" ? (y/n)" choice
	case "$choice" in
	y | Y)
		sed -i "/${oldHostName}/c ${newHostName}" /etc/hostname
        sed -i "/127.0.1.1/c 127.0.1.1      ${newHostName}" /etc/hosts # NOTE /etc/hosts is required for some gnome program like 'chmod'
		;;
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
$fcn $remain_params
