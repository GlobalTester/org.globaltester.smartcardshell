/**
 *  ---------
 * |.##> <##.|  SmartCard-HSM Support Scripts
 * |#       #|
 * |#       #|  Copyright (c) 2011-2012 CardContact Software & System Consulting
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
 * @fileoverview SmartCard-HSM Public Key Authentication Support
 */

var CVC = require("scsh/eac/CVC").CVC;
var PublicKeyReference = require("scsh/eac/PublicKeyReference").PublicKeyReference;



/**
 * Manage Public Key Authentication
 *
 * @class Class providing support for public key authentication
 * @constructor
 * @param {SmartCardHSM} sc the SmartCard-HSM used as target for PKA
 * @param {ByteString} deviceId the device id as returned by getCHR().getBytes() for the device certificate
 */
function ManagePKA(sc, deviceId) {

	this.sc = sc;
	this.deviceId = deviceId;
	this.card = sc.card;

	this.numberOfPublicKeys = 0; 		// Dummy
	this.missingPublicKeys = 0;
	this.requiredPublicKeysForAuthentication = 0;
	this.authenticatedPublicKeys = 0;
}

exports.ManagePKA = ManagePKA;



/**
 * Update internal status
 * @private
 */
ManagePKA.prototype.updateStatus = function(status) {
	this.numberOfPublicKeys = status.byteAt(0);
	this.missingPublicKeys = status.byteAt(1);
	this.requiredPublicKeysForAuthentication = status.byteAt(2);
	this.authenticatedPublicKeys = status.byteAt(3);
}



/**
 * Check if public key authentication is active for device
 *
 * @type boolean
 * @return true if supported and active
 */
ManagePKA.prototype.isActive = function() {
	var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x54, 0x00, 0x00, 0);
	if (this.card.SW != 0x9000) {
		return false;
	}
	this.updateStatus(status);
	return true;
}



/**
 * Check if registered public keys can be enumerated
 *
 * @type boolean
 * @return true if enumeration is supported
 */
ManagePKA.prototype.canEnumeratePublicKeys = function() {
	this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x54, 0x02, 0x00, 0, [0x9000, 0x9001, 0x6A88, 0x6A86 ] );
	return this.card.SW != 0x6A86;
}



ManagePKA.KEY_PRESENT = 1;
ManagePKA.KEY_NOT_FOUND = 2;
ManagePKA.KEY_ALREADY_AUTHENTICATED = 3;

/**
 * Check status of public key
 *
 * @param {PublicKeyReference} chr the public key reference under which the public key is registered
 * @type Number
 * @return ManagePKA.KEY_PRESENT if key is registered in SmartCard-HSM, ManagePKA.KEY_NOT_FOUND if not.
 *         ManagePKA.KEY_ALREADY_AUTHENTICATED is returned if the public key has already been authenticated
 */
ManagePKA.prototype.checkKeyStatus = function(chr) {
	var pukrefdo = new ASN1(0x83, chr.getBytes());
	var pukref = pukrefdo.getBytes();

	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x22, 0x81, 0xA4, pukref, [0x9000, 0x6A88, 0x6985 ]);

	switch(this.card.SW) {
		case 0x9000: return ManagePKA.KEY_PRESENT;
		case 0x6A88: return ManagePKA.KEY_NOT_FOUND;
		case 0x6985: return ManagePKA.KEY_ALREADY_AUTHENTICATED;
	}
}



/**
 * Perform authentication with source SmartCard-HSM and key on that device
 *
 * @param {SmartCardHSM} srcsc the SmartCard-HSM containing the private key for authentication
 * @param {Key} key the private key
 */
ManagePKA.prototype.performAuthentication = function(srcsc, key) {
	var challenge = this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x84, 0x00, 0x00, 8, [0x9000]);

	var input = this.deviceId.concat(challenge);

	var crypto = srcsc.getCrypto();

	var signature = crypto.sign(key, Crypto.ECDSA_SHA256, input);

	signature = CVC.unwrapSignature(signature, 32);
	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x82, 0x00, 0x00, signature, [0x9000]);

	var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x54, 0x00, 0x00, 0, [0x9000] );
	this.updateStatus(status);
}



/**
 * Get number of public keys (m)
 *
 * @type Number
 * @return the number of public keys (m)
 */
ManagePKA.prototype.getNumberOfPublicKeys = function() {
	return this.numberOfPublicKeys;
}



/**
 * Get number of public keys missing for complete setup
 *
 * @type Number
 * @return the number of public keys missing for complete setup
 */
ManagePKA.prototype.getMissingPublicKeys = function() {
	return this.missingPublicKeys;
}



/**
 * Get number of keys required for successfull authentication (n)
 *
 * @type Number
 * @return the number of keys required for successfull authentication (n)
 */
ManagePKA.prototype.getRequiredPublicKeysForAuthentication = function() {
	return this.requiredPublicKeysForAuthentication;
}


/**
 * Get number of keys already authenticated in this session
 *
 * @type Number
 * @return the number of keys already authenticated in this session
 */
ManagePKA.prototype.getAuthenticatedPublicKeys = function() {
	return this.authenticatedPublicKeys;
}



/**
 * Describe current status in human readable form
 *
 * @type String
 * @return the status
 */
ManagePKA.prototype.describeStatus = function() {
	if (this.missingPublicKeys) {
		return "" + this.missingPublicKeys + " missing key(s) in " + this.requiredPublicKeysForAuthentication + " of " + this.numberOfPublicKeys + " public key authentication";
	} else {
		return "" + this.authenticatedPublicKeys + " authenticated public key(s) in " + this.requiredPublicKeysForAuthentication + " of " + this.numberOfPublicKeys + " scheme";
	}
}



/**
 * Enumerate names (CHR) or registered public keys
 *
 * @type Object
 * @return Object with property chr containing the PublicKeyReference and with property
 *         status containing ManagePKA.KEY_PRESENT if a key is registered at that slot,
 *         ManagePKA.KEY_NOT_FOUND if not. ManagePKA.KEY_ALREADY_AUTHENTICATED is returned
 *         if the public key has already been authenticated.
 */
ManagePKA.prototype.enumeratePublicKeys = function() {
	var list = [];

	for (var i = 0; i < this.numberOfPublicKeys; i++) {
		var bin = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x54, 0x02, i, 0, [0x9000, 0x9001, 0x6A88 ] );

		if (this.card.SW == 0x6A88) {
			list.push( { status: ManagePKA.KEY_NOT_FOUND } );
		} else {
			var chr = new PublicKeyReference(bin);
			if (this.card.SW == 0x9000) {
				status = ManagePKA.KEY_PRESENT;
			} else {
				status = ManagePKA.KEY_ALREADY_AUTHENTICATED;
			}
			list.push( { chr: chr, status: status} );
		}
	}
	return list;
}



/**
 * Validate and register public key
 *
 * @param {CVC} pk public key in CSR format from card
 * @param {CVC} devcert device certificate
 * @param {CVC} dicacert device issuer certificate
 * @param {Number} replace the id of the key to be replaced (0-based) or undefined
 */
ManagePKA.prototype.registerPublicKey = function(pk, devcert, dicacert, replace) {
	this.sc.verifyCertificate(dicacert);
	this.sc.verifyCertificate(devcert);

	var car = pk.getOuterCAR().getBytes();

	var pukrefdo = new ASN1(0x83, car);
	var pukref = pukrefdo.getBytes();

	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x22, 0x81, 0xB6, pukref, [0x9000]);

	// Extract value of 67
	var tl = new TLVList(pk.getBytes(), TLV.EMV);
	var t = tl.index(0);
	var v = t.getValue();

	if (typeof(replace) == "number") {
		var p1 = 1;
		var p2 = replace;
	} else {
		var p1 = 0;
		var p2 = 0;
	}

	var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x54, p1, p2, v, 0, [0x9000] );
	this.updateStatus(status);
}
