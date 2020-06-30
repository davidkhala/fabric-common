CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)
export SOFTHSM2_CONF=$CURRENT/softhsm2-sample.conf
export HSM_SO_PIN="fabric"
export HSM_PIN="fabric"
label="test"
testOnNextFreeSlot() {
	../softHSM.sh initToken $label
	../softHSM.sh listToken
	../softHSM.sh deleteToken $label
	../softHSM.sh listToken
}

testListToken() {
	../softHSM.sh listToken serialOnly
}

. shunit2
