#!/usr/bin/env bash
#NOTE This script only work from 1.0.0-rc1 to 1.1.x
#
CURRENT=$(cd $(dirname ${BASH_SOURCE}); pwd)
Parent=$(dirname $CURRENT)

VERSION="1.0.0"
ARCH=$(echo "$(uname -s | tr '[:upper:]' '[:lower:]' | sed 's/mingw64_nt.*/windows/')-$(uname -m | sed 's/x86_64/amd64/g')" | awk '{print tolower($0)}')
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
# auto-skip when version matching...
# NOTE peer binary cannot be used inside shell file
configtxlatorFile=$Parent/bin/configtxlator
if [ -f $configtxlatorFile ]; then
	binVersion=$($configtxlatorFile version | grep Version | awk '{print $2}')
	if [ "$binVersion" == "$VERSION" ]; then
		echo Current Version $binVersion matched, skipped
		exit 0
    else
        echo Current Version $binVersion mismatch with $VERSION
	fi
fi


cd $Parent

echo "===> Downloading platform binaries: version: $ARCH $VERSION"
curl https://nexus.hyperledger.org/content/repositories/releases/org/hyperledger/fabric/hyperledger-fabric/${ARCH}-${VERSION}/hyperledger-fabric-${ARCH}-${VERSION}.tar.gz | tar xz
