
/*
 * Checks if the given byte buffer contains a valid length encoding according to ICAO LDS TR
 *
 * Returns the encoded length as a number
 */

load("defineAsserts.js");

function checkLengthEncoding(bs) {
	
	print("Checking length encoding for byte buffer: " + bs.toString(16));

	if (bs.length == 0) {
		assertFailure("Empty byte string!");
	}

	
	
	firstByte = bs.byteAt(0);
	
	length = 0;
		
	if (firstByte == 0x81) {
		
		print("Two byte length");
		
		if (bs.length >= 2) {
			secondByte = bs.byteAt(1);
			print("secondByte: " + secondByte);
			
			assertRange(128, 255, secondByte, FAILURE);
			length = secondByte;
		} else {
			assertFailure("Wrong length encoding, expecting two bytes!");
		}
		
		
	} else if (firstByte == 0x82) {
	
		if (bs.length >= 2) {
			print("Three byte length");
				
			a1 = bs.byteAt(1);
			a2 = bs.byteAt(2);
			
			length = (a1 << 8) | a2;

		} else {
			assertFailure("Wrong length encoding, expecting three bytes!");
		}
		
	} else {
	
		print("One byte length");
		
		assertRange(0, 127, firstByte, FAILURE);
		
		length = firstByte;
	} 
	
	print("Encoded length: " + length);
	
	return length;
}
