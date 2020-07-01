#!/usr/bin/env bash
## only function name starting with lowerCase character will be considered


command -v shunit2 || {
	curl -sLo /usr/local/bin/shunit2 https://raw.githubusercontent.com/kward/shunit2/master/shunit2
	chmod +x /usr/local/bin/shunit2
}
