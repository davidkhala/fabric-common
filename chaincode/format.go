package chaincode

import "strconv"

func ToInt(bytes []byte) int {
	if bytes==nil{
		return 0
	}
	i, err := strconv.Atoi(string(bytes))
	if err != nil {
		panic(err)
	}
	return i
}
func ToBytes(i int) []byte {
	return []byte(strconv.Itoa(i))
}