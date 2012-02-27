/*
 * Define some constants for GlobalTester
 */
 
//define classes for a short method call in scripts
var HexString = new Packages.de.cardcontact.tlv.HexString();
var ByteUtil  = new Packages.org.globaltester.util.ByteUtil();
var TLVUtil   = new Packages.org.globaltester.util.TLVUtil();

//define aqivalent cases for return codes
SW_NoError = new Array("9000");
SW_NormalProcessing = new Array("90", "61");
SW_WarningProcessing = new Array("62", "63");
SW_ExecutionError = new Array("64", "65", "66");
SW_CheckingError = new Array("67", "68", "69", "6A", "6B", "6C", "6D", "6E", "6F");

// define valid Chars for MRZ coding
validAlphabeticChars = new Array ("A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z");
validSpecialChars = new Array ("<");
validNumericChars = new Array ("0", "1", "2", "3", "4", "5", "6", "7", "8", "9");

//Define names of failure, warning and response without data
NO_DATA = new String("NODATA");
FAILURE_TEXT = new String("Failure");
WARNING_TEXT = new String("Warning");
FAILURE = new String("F");
WARNING = new String("W");
