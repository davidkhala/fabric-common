CURRENT=$(cd $(dirname ${BASH_SOURCE}) && pwd)
export SOFTHSM2_CONF=$CURRENT/softhsm2-sample.conf
export HSM_SO_PIN="fabric"
export HSM_PIN="fabric"
label="test"
testOnNextFreeSlot() {
  $CURRENT/../softHSM.sh initToken $label
  $CURRENT/../softHSM.sh listToken
  $CURRENT/../softHSM.sh deleteToken $label
  $CURRENT/../softHSM.sh listToken
}

testListToken() {
  $CURRENT/../softHSM.sh listToken serialOnly
}

. shunit2
