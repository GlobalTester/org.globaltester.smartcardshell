
/*
 * Returns the number of bytes needed to encode the specified length
 */

function getSizeHelper(length) {

	if (length >= 0 && length <= 127) return 1;
	
	if (length >= 128 && length <= 255) return 2;
	
	if (length >= 256 && length <= 65536) return 3;

}