/*
 * Define some constants for GlobalTester
 */

//define classes for a short method call in scripts
HexString = new Packages.de.cardcontact.tlv.HexString();
ByteUtil  = new Packages.org.globaltester.util.ByteUtil();
TLVUtil   = new Packages.org.globaltester.util.TLVUtil();

//define aqivalent cases for return codes
SW_NoError = new Array("9000");
SW_NormalProcessing = new Array("90", "61");
SW_WarningProcessing = new Array("62", "63");
SW_ExecutionError = new Array("64", "65", "66");
SW_CheckingError = new Array("67", "68", "69", "6A", "6B", "6C", "6D", "6E", "6F");


//Define names of failure, warning and response without data
NO_DATA = new String("NODATA");
FAILURE_TEXT = new String("Failure");
WARNING_TEXT = new String("Warning");
FAILURE = new String("F");
WARNING = new String("W");
