/*
 * Define GlobalTester specific extensions to Card object
 */ 

//Card.prototype.gt = new function(){};

Card.prototype.gt_sendCommand = function(cmdAPDU) {
	return this.gt_SecureMessaging_sendCommand(cmdAPDU);
}

Card.prototype.gt_sendSM = function(cmdAPDU) {
	return this.gt_SecureMessaging_sendSM(cmdAPDU);
}

Card.prototype.gt_sendPlain = function (command){
	encodedResp = new ByteString("", HEX);
	logCmdApdu = "=> Command APDU [\n"+HexString.dump(command)+"\n] C-APDU";
	print(logCmdApdu);
	resp = this.plainApdu(command);
	logRespApdu = "<= Response APDU [\n"+HexString.dump(resp)+"\n] R-APDU";
	print(logRespApdu);
	print ("SW: "+this.SW.toString(HEX) + "   (" + this.SWMSG + ")");
	return resp;
}