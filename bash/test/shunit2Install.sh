#!/usr/bin/env bash
## only function name starting with lowerCase character will be considered


command -v shunit2 || {
	sudo curl -sLo /usr/local/bin/shunit2 https://raw.githubusercontent.com/kward/shunit2/master/shunit2
	sudo chmod +x /usr/local/bin/shunit2
}
