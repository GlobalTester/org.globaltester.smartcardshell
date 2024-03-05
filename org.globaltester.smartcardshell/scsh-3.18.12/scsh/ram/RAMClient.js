/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2006 CardContact Software & System Consulting
 * |'##> <##'|  Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
 *  ---------
 *
 *  This file is part of OpenSCDP.
 *
 *  OpenSCDP is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2 as
 *  published by the Free Software Foundation.
 *
 *  OpenSCDP is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OpenSCDP; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * @fileoverview Remote Application Management over HTTP (RAMoverHTTP) client
 */

/**
 * Create a client instance for attaching a card to a server via the RAMOverHTTP procotol
 *
 * @Class Class implementing a RAMOverHTTP client
 * @constructor
 * @param {Card} card the card instance to attach
 * @param {String} url the URL to connect to
 * @param {String} session the session cookie
 */
function RAMClient(card, url, session) {
	this.card = card;
	this.url = url;
	this.session = session;
	this.httpCode = -1;
	this.apduCount = 0;
	this.aPDULimit = 100000;
	this.httpcount = 0;
	this.httplimit = 100000;
	this.forceFailSW = 0;
	this.returnAllSW = false;
}



exports.RAMClient = RAMClient;



/**
 * Prepend a 0, if the encoded integer is interpreted as negative value otherwise
 */
RAMClient.asSignedInteger = function(val) {
	var enc = ByteString.valueOf(val);
	if (enc.byteAt(0) >= 0x80) {
		enc = ByteString.valueOf(0).concat(enc);
	}
	return enc;
}



/**
 * @private
 */
RAMClient.prototype.encodeInitiation = function(atr) {
	var pit = new ASN1(0xE8, new ASN1(0xC0, atr));
	if (typeof(this.maxCAPDUSize) == "number") {
		pit.add(new ASN1(0xC1, RAMClient.asSignedInteger(this.maxCAPDUSize)));
	}
	if (typeof(this.maxRAPDUSize) == "number") {
		pit.add(new ASN1(0xC2, RAMClient.asSignedInteger(this.maxRAPDUSize)));
	}
	return pit.getBytes();
}



/**
 * Set a notification listener.
 *
 * The listener object must implement a notificationReceived() method that
 * receives the three parameter id, msg and ttc.
 *
 * @param {Object} the listener object implementing notificationReceived()
 */
RAMClient.prototype.setNotificationListener = function(notificationListener) {
	this.notificationListener = notificationListener;
}



/**
 * Set a limiting number of APDUs
 *
 * This is helpful for testing to intercept processing after a certain number
 * of APDUs (Default 100000).
 *
 * @param {Number} aPDULimit the maximum number of APDU processing in update()
 * @param {Number} forceFailSW the final SW1/SW2
 */
RAMClient.prototype.setAPDULimit = function(aPDULimit, forceFailSW) {
	this.aPDULimit = aPDULimit;
	this.forceFailSW = forceFailSW;
}



/**
 * Set a limiting number of HTTP roundtrips
 *
 * This is helpful for testing to intercept processing after a certain number
 * of HTTP roundtrips (Default 100000).
 *
 * @param {Number} aPDULimit the maximum number of APDU processing in update()
 * @param {Number} forceFailSW the final SW1/SW2
 */
RAMClient.prototype.setHTTPLimit = function(httplimit) {
	this.httplimit = httplimit;
}



/**
 * Set a maximum command and response APDU size
 *
 * @param {Number} maxCAPDUSize The maximum number of bytes in the command APDU
 * @param {Number} maxRAPDUSize The maximum number of bytes in the response APDU
 */
RAMClient.prototype.setMaxAPDUSize = function(maxCAPDUSize, maxRAPDUSize) {
	this.maxCAPDUSize = maxCAPDUSize;
	this.maxRAPDUSize = maxRAPDUSize;
}



/**
 * @private
 */
RAMClient.prototype.getURLConnection = function() {
	if (typeof(this.connectionFactory) != "undefined") {
		c = this.connectionFactory.getConnection(this.url, this.session);
	} else {
		var c = new URLConnection(this.url);
		if (typeof(this.session) != "undefined") {
//			print(typeof(this.session));
			c.addHeaderField("Cookie", this.session);
		}
	}
	c.addHeaderField("Content-Type", "application/org.openscdp-content-mgt-response;version=1.0");
	return c;
}



/**
 * @private
 */
RAMClient.prototype.initialConnect = function() {
	var c = this.getURLConnection();
	var atr = this.card.getATR();
	var b = this.encodeInitiation(atr.toByteString());
	var cst = c.postBinary(b);

	var cookie = c.getHeaderField("Set-Cookie");
	if (cookie) {
//		print(cookie);
		this.session = cookie[0];
	}

	this.httpCode = c.responseCode;
	return cst;
}



/**
 * @private
 */
RAMClient.prototype.next = function(rst) {
	var c = this.getURLConnection();
	var cst = c.postBinary(rst);

	this.httpCode = c.responseCode;
	return cst;
}



/**
 * @private
 */
RAMClient.prototype.processAPDU = function(capdu) {
	var rapdu = this.card.plainApdu(capdu);
	rapdu = rapdu.concat(ByteString.valueOf(this.card.SW, 2));
	this.apduCount++;

	if ((this.apduCount >= this.aPDULimit) && this.forceFailSW) {
		rapdu = ByteString.valueOf(this.forceFailSW, 2);
	}
	return new ASN1(0x23, rapdu);
}



/**
 * @private
 */
RAMClient.prototype.processReset = function() {
	var atr = this.card.reset(Card.RESET_COLD);
	if (atr instanceof Atr) {
		atr = atr.toByteString();
	}
	return new ASN1(0xC0, atr);
}



/**
 * @private
 */
RAMClient.prototype.processNotify = function(e) {
	if (this.notificationListener) {
		var id = e.get(0).value.toSigned();
		var str = e.get(1).value.toString(UTF8);
		var ttc = undefined;
		if (e.elements > 2) {
			ttc = e.get(0).value.toUnsigned();
		}
		this.notificationListener.notificationReceived(id, str, ttc);
	} else {
		print("Notify:");
		print(e);
	}
}



RAMClient.SW9000 = new ByteString("9000", HEX);

/**
 * @private
 */
RAMClient.prototype.process = function(cst) {
//	print(cst);
	var a = new ASN1(cst);
//	print(a);

	var rst = new ASN1(0xAB);

	var cnt = 0;
	var rsp;

	for (var i = 0; (i < a.elements); i++) {
		var e = a.get(i);
		switch(e.tag) {
			case 0x22:
				// Abort processing of APDU sequence if SW != 9000
				if (rsp && !rsp.value.right(2).equals(RAMClient.SW9000)) {
					print("Abort sequence");
					print(rsp);
					i = a.elements;
					break;
				}
				rsp = this.processAPDU(e.value);
				if (this.returnAllSW) {
					rst.add(rsp);
				}
				cnt++;
				break;
			case 0xC0:
				rst.add(this.processReset());
				break;
			case 0xE0:
				this.processNotify(e);
				break;
		}
	}

	if (rsp && !this.returnAllSW) {
		rst.add(rsp);
	}
	rst.add(new ASN1(0x80, RAMClient.asSignedInteger(cnt)));
//	print(rst);
//	print(rst.getBytes());
	return rst.getBytes();
}



/**
 * Close connection, e.g. after exception on the client side
 *
 * @param {Number} id the message id
 * @param {String} msg the closing message
 */
RAMClient.prototype.close = function(id, msg) {
	var c = this.getURLConnection();

	var rst = new ASN1(0xAB,
			new ASN1(0xE1,
				 new ASN1(ASN1.INTEGER, RAMClient.asSignedInteger(id)),
				 new ASN1(ASN1.UTF8String, new ByteString(msg, UTF8))
			    )
		      ).getBytes();

	var cst = this.next(rst);
	while (this.httpCode == 200) {
		var rst = this.process(cst);
		cst = this.next(rst);
	}
}



/**
 * Perform update operation
 */
RAMClient.prototype.update = function() {
	this.httpCode = -1;
	this.apduCount = 0;
	var cst = this.initialConnect();
	while ((this.httpCode == 200) && (this.httpcount < this.httplimit)) {
		this.httpcount++;
		var rst = this.process(cst);
		cst = this.next(rst);
	}
}
