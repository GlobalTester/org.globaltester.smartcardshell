/*
 * Define some constants for GlobalTester
 */ 

// Define response without data
NO_DATA = new String("NODATA");


// Maximum number of bytes encoding the length
MAX_LENGTH_BYTES = 3;

// Define names of failure, warning
FAILURE_TEXT = new String("Failure");
WARNING_TEXT = new String("Warning");
FAILURE = new String("F");
WARNING = new String("W");

	
function assertStatusWord(validSW, receivedSW, rating) { 
			
		if (rating == null) {
			rating = FAILURE;
		}

		print("Expected status word(s): "+validSW);
		print("Received status word:    "+receivedSW);
							
		match = false;
		for (var i = 0; i < validSW.length; i++) {
			if (validSW[i].toLowerCase() == receivedSW.toLowerCase()) {
				match = true;
				print ("Actual and expected return codes match. Okay.");
				break;
			}
		}
		if (!match) {				
			if (rating.toUpperCase() == WARNING) {
				print ("Test warning: The actual and expected returncodes do not match!");
				throw new AssertionError("SHELL", WARNING, 1, "Unexpected status word reveived!", validSW, receivedSW);
			}
			else {
				print("Test failure: The actual and expected returncodes do not match!");
				throw new AssertionError("SHELL", FAILURE, 2, "Unexpected status word received!", validSW, receivedSW);
			}	
		}
			
		return match;
	}
 
function assertResponse(expectedResp, receivedResp, rating) {

		if (rating == null) {
			rating = FAILURE;
		}

		print("Expected response: "+expectedResp);
		print("Received response: "+receivedResp);

		if (expectedResp == NO_DATA) {
			if (receivedResp.length == 0) {
				print ("Actual and expected response match. Okay.");	
			}
			else {
				if (rating.toUpperCase() == WARNING) {
					print ("Test warning: The actual and expected response do not match!");
					throw new AssertionError("SHELL", WARNING_TEXT, 1, "Unexpected response received!", expectedResp, receivedResp);
				}
				else {
					print("Test failure: The actual and expected response do not match!");
					throw new AssertionError("SHELL", FAILURE_TEXT, 2, "Unexpected response received!", expectedResp, receivedResp);
				}
			}
			return;
		}
	
		if (expectedResp.toString() == receivedResp.toString()) {
			print ("Actual and expected response match. Okay.");
		}
		else {
			if (rating.toUpperCase() == WARNING) {
				print ("Test warning: The actual and expected response do not match!");
				throw new AssertionError("SHELL", WARNING_TEXT, 1, "Unexpected response received!", expectedResp, receivedResp);
			}
			else {
				print("Test failure: The actual and expected response do not match!n");
				throw new AssertionError("SHELL", FAILURE_TEXT, 2, "Unexpected response received!", expectedResp, receivedResp);
			}	
		}

	}
		


function assertMatchValue(expectedValue, receivedValue, rating) {
	
	failure = true;

	print("Expected value: "+expectedValue);
	print("Received value: "+receivedValue);
	
	if (expectedValue instanceof java.math.BigInteger) {
		if (expectedValue.equals(receivedValue)) {
			failure = false;
		}		
	} else {

		if (expectedValue instanceof Array) {
		
			for (var i = 0; i < expectedValue.length; i++) {	
				if (expectedValue[i] == receivedValue) {
					failure = false;
					break;
				}
			}
			
		} else {
			
			if (expectedValue == receivedValue) {
				failure = false;
			}
		}
	}
	
	if (failure) {

		if (rating == WARNING) { 
			print("WARNING: Value " + receivedValue.toString(HEX) + " does not match expected value!");		
			throw new AssertionError("SHELL", WARNING, 1, "Value " + receivedValue.toString(HEX) + " does not match expected value!", expectedValue, receivedValue.toString(HEX));
		} else {
			print("ERROR: Value " + receivedValue.toString(HEX) + " does not match expected value!");					
			throw new AssertionError("SHELL", FAILURE, 2, "Value " + receivedValue.toString(HEX) + " does not match expected value!", expectedValue, receivedValue.toString(HEX));
		}	
		
	} else {
		print("Value matched. Okay.");
	}
}


function assertNotMatchValue(value, receivedValue, rating) {
	
	failure = false;

	if (value instanceof java.math.BigInteger || receivedValue instanceof java.math.BigInteger) {
		if (value.equals(receivedValue)) {
			failure = true;
		}		
	} else {
	
		if (value instanceof Array) {
			
			for (var i = 0; i < value.length; i++) {			
				if (value[i] == receivedValue) {
					failure = true;
					break;
				}
			}
			
		} else {
			
			if (value == receivedValue) {
				failure = true;
			}
		}
	}
	
	if (failure) {

		if (rating == WARNING) { 
			print("WARNING: Value " + receivedValue.toString(HEX) + " does match expected value!");		
			throw new AssertionError("SHELL", WARNING, 1, "Value " + receivedValue.toString(HEX) + " does match expected value!");
		} else {
			print("ERROR: Value " + receivedValue.toString(HEX) + " does match expected value!");					
			throw new AssertionError("SHELL", FAILURE, 2, "Value " + receivedValue.toString(HEX) + " does match expected value!");
		}	
		
	} else {
		print("Value does not match. Okay.");
	}
}



function assertRange(expectedMin, expectedMax, value, rating) {
	
	print("Expected value range: "+expectedMin+" - "+expectedMax);
	print("Received value:       "+value);
	
	
	if (value < expectedMin || value > expectedMax) {

		if (rating == WARNING) { 
			print("WARNING: Value " + value.toString(HEX) + " does not match expected range!");		
			throw new AssertionError("SHELL", WARNING, 1, "Value " + value.toString(HEX) + " does not match expected range!", expectedMin+" - "+expectedMax, value);
		} else {
			print("ERROR: Value " + value.toString(HEX) + " does not match expected range!");					
			throw new AssertionError("SHELL", FAILURE, 2, "Value " + value.toString(HEX) + " does not match expected range!", expectedMin+" - "+expectedMax, value);
		}	
	} else {
		print("Value within range. Okay");
	}
	
}


function assertLessOrEqual(maxValue, value, rating) {
	
	print("Expected max value: "+maxValue);
	print("Received value:     "+value);
	
	if (value > maxValue) {

		if (rating == WARNING) {
			print("WARNING: Value " + value + " is not less or equal than expected value " + maxValue + "!");		
			throw new AssertionError("SHELL", WARNING, 1, "Value " + value + " is not less or equal than expected value " + maxValue + "!", "<= "+maxValue, value);
		} else {
			print("ERROR: Value " + value + " is not less or equal than expected value " + maxValue + "!");		
			throw new AssertionError("SHELL", FAILURE, 2, "Value " + value + " is not less or equal than expected value " + maxValue + "!", "<= "+maxValue, value);
		}	
	} else {
		print("Value is less or equal. Okay.");
	}
}


function assertBiggerOrEqual(minValue, value, rating) {
	
	print("Expected min value: "+minValue);
	print("Received value:     "+value);

	if (value < minValue) {

		if (rating == WARNING) { 
			print("WARNING: Value " + value + " is not bigger or equal than expected value " + minValue + "!");		
			throw new AssertionError("SHELL", WARNING, 1, "Value " + value + " is not bigger or equal than expected value " + minValue + "!", ">= "+minValue, value);
		} else {
			print("ERROR: Value " + value + " is not bigger or equal than expected value " + minValue + "!");		
			throw new AssertionError("SHELL", FAILURE, 2, "Value " + value + " is not bigger or equal than expected value " + minValue + "!", ">= "+minValue, value);
		}	
	} else {
		print("Value is bigger or equal. Okay.");
	}
}

function assertSMResponse(rating) {
	if (checkSMEncoding()) {
		print ("RAPDU is SM encoded. Okay.");
	} else {
		if (rating == WARNING) { 
			assertWarning("Response APDU should be SM encoded!");		
		} else {
			assertFailure("Response APDU must be SM encoded!");		
		}	
	}
}

function assertPlainResponse(rating) {
	if (!checkSMEncoding()) {
		print ("RAPDU is plain response. Okay.");
	} else {
		if (rating == WARNING) { 
			assertWarning("Response APDU should be in plain!");		
		} else {
			assertFailure("Response APDU should be in plain!");		
		}	
	}
}



function assertWarning(msg) {
	
	print("Test Warning: " + msg);		
	throw new GPError("SHELL", WARNING, 1, msg);	
}

function assertFailure(msg) {
	
	print("Test Failure: " + msg);		
	throw new GPError("SHELL", FAILURE, 2, msg);	
}
