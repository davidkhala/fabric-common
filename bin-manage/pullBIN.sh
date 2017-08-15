#!/bin/bash
#
# Copyright IBM Corp. All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#

VERSION=1.0.1
for ((i = 1; i <= $#; i++)); do
	j=${!i}
	remain_params="$remain_params $j"
done
while getopts "v:" shortname $remain_params; do
	case $shortname in
	v)
		echo "set binary version (default: $VERSION) ==> $OPTARG"
		VERSION=$OPTARG
		;;
	?)
		echo "unknown argument"
		exit 1
		;;
	esac
done
ARCH=$(echo "$(uname -s|tr '[:upper:]' '[:lower:]'|sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')

CURRENT="$(dirname $(readlink -f ${BASH_SOURCE}))"
Parent=$(dirname $CURRENT)
cd $Parent

echo "===> Downloading platform binaries: version: $ARCH $VERSION"
curl https://nexus.hyperledger.org/content/repositories/releases/org/hyperledger/fabric/hyperledger-fabric/${ARCH}-${VERSION}/hyperledger-fabric-${ARCH}-${VERSION}.tar.gz | tar xz



