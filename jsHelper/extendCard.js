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

Card.prototype.gt_reset = function () {
	print("Reseting chip");
	var atr = this.reset(Card.RESET_COLD);
	print (atr);
	
	this.gt_SecureMessaging_resetSM();
	
	return atr;
}

Card.prototype.gt_getCardConfig = function (protocol, key) {
	if (this.gt_cardConfig == undefined) {
		assertWarning("gt_cardConfig is not defined yet, will be created now");
	    this.gt_cardConfig = new Packages.org.globaltester.cardconfiguration.CardConfig();
	}
	return this.gt_cardConfig.get(protocol, key);
}
