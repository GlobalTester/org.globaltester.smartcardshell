/*
 * Define GlobalTester specific extensions to Card object
 */ 

//Card.prototype.gt = new function(){};

Card.prototype.gt_sendCommand = function(command) {
	//TODO implement optional secure messaging here
	return this.gt_sendPlain(command);
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