/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2009 CardContact Software & System Consulting
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
 * @fileoverview Support for Global Platform SCP03 protocol
 */

var APDU = require('scsh/cardsim/APDU').APDU;



/**
 * Class implementing support for Global Platform SCP03 secure messaging protocol
 *
 * @constructor
 * @param {Crypto} crypto the crypto provider
 * @param {Key} kenc the static secure channel encryption key
 * @param {Key} kmac the static secure channel message authentication code key
 * @param {Key} kdek the static data encryption key
 * @param {ByteString) aid the AID to use for challenge calculation
 */
function GPSCP03(crypto, kenc, kmac, kdek, aid) {
	this.crypto = crypto;
	this.kenc = kenc;
	this.kmac = kmac;
	this.kdek = kdek;
	this.chaining = ByteString.valueOf(0, 16);
	this.enccnt = 1;
	this.seclevel = 0;
	this.keyVersion = 1;
	this.parami = 0;

	if (aid != undefined) {
		assert(aid instanceof ByteString, "Argument aid must be ByteString");
		this.aid = aid;
	} else {
		this.aid = new ByteString("A000000151000000", HEX);
	}
}

exports.GPSCP03 = GPSCP03;



/**
 * Strip the ISO padding from dechipered cryptogram
 *
 * @param {ByteString} the plain text with padding
 * @type ByteString
 * @return the plain text without padding
 */
GPSCP03.stripPadding = function(plain) {
	var i = plain.length - 1;
	while ((i > 0) && (plain.byteAt(i) == 0)) {
		i--;
	}
	if (plain.byteAt(i) != 0x80) {
		throw new GPError(module.id, GPError.CRYPTO_FAILED, 0, "Padding check failed");
	}
	return plain.left(i);
}



/**
 * Reset the internal state
 **/
GPSCP03.prototype.reset = function() {
	this.chaining = ByteString.valueOf(0, 16);
	this.enccnt = 1;
	this.seclevel = 0;
}



/**
 * Called by the secure messaging wrapper to wrap the command APDU
 */
GPSCP03.prototype.wrap = function(apduToWrap, usageQualifier) {

	if (this.seclevel & 0x01) {
		var apdu = new APDU(apduToWrap);

		if (apdu.hasCData()) {
			if (this.seclevel & 0x02) {
				var ivinp = ByteString.valueOf(this.enccnt, 16);
				var iv = this.crypto.encrypt(this.skenc, Crypto.AES_ECB, ivinp);
				var encinp = apdu.getCData().pad(Crypto.ISO9797_METHOD_2_16);

				apdu.setCData(this.crypto.encrypt(this.skenc, Crypto.AES_CBC, encinp, iv));
			}
		} else {
			apdu.setCData(new ByteString("", HEX));
		}

		var bb = new ByteBuffer();
		bb.append(this.chaining);

		var cla = apdu.getCLA();
		if (cla & 0x40) {
			// GP Format
			cla = cla & 0xC0 | 0x40;
			apdu.cla |= 0x40;
		} else {
			// ISO Format
			cla = cla & 0x80 | 0x04;
			apdu.cla |= 0x04;
		}
		bb.append(cla);
		bb.append(apdu.getINS());
		bb.append(apdu.getP1());
		bb.append(apdu.getP2());

		var lc = apdu.getCData().length + 8;
		if (apdu.isExtendedLength()) {
			bb.append(0);
			bb.append(ByteString.valueOf(lc, 2));
		} else {
			bb.append(ByteString.valueOf(lc, 1));
		}

		bb.append(apdu.getCData());
		var mac = this.crypto.sign(this.skmac, Crypto.AES_CMAC, bb.toByteString());

		this.chaining = mac;

		apdu.setCData(apdu.getCData().concat(mac.left(8)));

		if (this.clatransformation) {
			apdu.setCLA(this.clatransformation(apdu.getCLA()));
		}

		apduToWrap = apdu.getCommandAPDU();
	}
	return apduToWrap;
}



/**
 * Called by the secure messaging wrapper to unwrap the response APDU
 */
GPSCP03.prototype.unwrap = function(apduToUnwrap, usageQualifier) {
	if ((this.seclevel & 0x10) && (apduToUnwrap.length > 2)) {
		var bb = new ByteBuffer();
		bb.append(this.chaining);
		bb.append(apduToUnwrap.left(apduToUnwrap.length - 10));
		bb.append(apduToUnwrap.right(2));

		var mac = this.crypto.sign(this.skrmac, Crypto.AES_CMAC, bb.toByteString()).left(8);

		if (!mac.equals(apduToUnwrap.bytes(apduToUnwrap.length - 10, 8))) {
			throw new GPError(module.id, GPError.CRYPTO_FAILED, 0, "MAC on R-Data failed verification");
		}

		if ((this.seclevel & 0x20) && (apduToUnwrap.length > 10)) {
			var ivinp = ByteString.valueOf(0x80).concat(ByteString.valueOf(this.enccnt, 15));
			var iv = this.crypto.encrypt(this.skenc, Crypto.AES_ECB, ivinp);

			var plain = this.crypto.decrypt(this.skenc, Crypto.AES_CBC, apduToUnwrap.left(apduToUnwrap.length - 10), iv);
			apduToUnwrap = GPSCP03.stripPadding(plain).concat(apduToUnwrap.right(2));
		} else {
			apduToUnwrap = apduToUnwrap.left(apduToUnwrap.length - 10).concat(apduToUnwrap.right(2));
		}
	}

	this.enccnt++;

	return apduToUnwrap;
}




/**
 * Counterpart to wrap and meant to be used in a simulator
 */
GPSCP03.prototype.unwrapCommandAPDU = function(apdu) {
	if (this.seclevel == 0) {
		throw new GPError(module.id, GPError.CRYPTO_FAILED, APDU.SW_CONDOFUSENOTSAT, "No secure messaging active");
	}

	if (this.seclevel & 0x01) {
		if (!apdu.hasCData() || apdu.getCData().length < 8) {
			throw new GPError(module.id, GPError.CRYPTO_FAILED, APDU.SW_SMOBJMISSING, "MAC on C-Data missing");
		}
		var bb = new ByteBuffer();
		bb.append(this.chaining);

		var cla = apdu.getCLA();
		if (cla & 0x40) {
			// GP Format
			cla = cla & 0xC0 | 0x40;
		} else {
			// ISO Format
			cla = cla & 0x80 | 0x04;
		}

		bb.append(cla);
		bb.append(apdu.getINS());
		bb.append(apdu.getP1());
		bb.append(apdu.getP2());

		var lc = apdu.getCData().length;
		if (apdu.isExtendedLength()) {
			bb.append(0);
			bb.append(ByteString.valueOf(lc, 2));
		} else {
			bb.append(ByteString.valueOf(lc, 1));
		}

		bb.append(apdu.getCData().left(lc - 8));

		var mac = this.crypto.sign(this.skmac, Crypto.AES_CMAC, bb.toByteString());

		if (!mac.left(8).equals(apdu.getCData().right(8))) {
			throw new GPError(module.id, GPError.CRYPTO_FAILED, APDU.SW_SECSTATNOTSAT, "MAC on C-Data failed verification");
		}

		this.chaining = mac;

		apdu.setCData(apdu.getCData().left(lc - 8));

		if ((this.seclevel & 0x02) && (lc > 8)) {
			var ivinp = ByteString.valueOf(this.enccnt, 16);
			var iv = this.crypto.encrypt(this.skenc, Crypto.AES_ECB, ivinp);

			var plain = this.crypto.decrypt(this.skenc, Crypto.AES_CBC, apdu.getCData(), iv);
			apdu.setCData(GPSCP03.stripPadding(plain));
		}

	}
}



/**
 * Counterpart to unwrap and meant to be used in a simulator
 */
GPSCP03.prototype.wrapResponseAPDU = function(apdu) {
	if (this.seclevel & 0x10) {
		if ((this.seclevel & 0x20) && apdu.hasRData()) {
			var ivinp = ByteString.valueOf(0x80).concat(ByteString.valueOf(this.enccnt, 15));
			var iv = this.crypto.encrypt(this.skenc, Crypto.AES_ECB, ivinp);
			var plain = apdu.getRData().pad(Crypto.ISO9797_METHOD_2_16);

			var cryptogram = this.crypto.encrypt(this.skenc, Crypto.AES_CBC, plain, iv);
			apdu.setRData(cryptogram);
		}

		var bb = new ByteBuffer();
		bb.append(this.chaining);

		bb.append(apdu.getResponseAPDU());

		var mac = this.crypto.sign(this.skrmac, Crypto.AES_CMAC, bb.toByteString()).left(8);

		apdu.setRData(apdu.hasRData() ? apdu.getRData().concat(mac) : mac);
	}

	this.enccnt++;
}



GPSCP03.prototype.setCLATransformation = function(clatransformation) {
	assert(typeof(clatransformation) == "function", "Argument clatransformation must be a function");
	this.clatransformation = clatransformation;
}



/**
 * Issue INITIALIZE UPDATE command to card and parse response
 *
 * @param {Card} card the card to use
 * @param {Number} keyVersion the version of the key to use (0 for default)
 * @param {Number} keyId the key id to use (usually 0)
 */
GPSCP03.prototype.initializeUpdate = function(card, keyVersion, keyId) {
	this.hostChallenge = this.crypto.generateRandom(8);

	var cla = 0x80;
	if (this.clatransformation) {
		cla = this.clatransformation(cla);
	}

	var rsp = card.sendApdu(cla, 0x50, keyVersion, keyId, this.hostChallenge, 0, [0x9000]);

	this.diversificationData = rsp.bytes(0, 10);
	this.keyInformation = rsp.bytes(10, 3);
	this.keyVersion = this.keyInformation.byteAt(0);
	this.parami = this.keyInformation.byteAt(2);
	this.cardChallenge = rsp.bytes(13, 8);
	this.cardCryptogram = rsp.bytes(21, 8);
	if (rsp.length > 29) {
		this.sequenceCounter = rsp.bytes(29,3);
		var context = this.sequenceCounter.concat(this.aid);
		var ref = this.deriveKey(this.kenc, 2, 8, context);
		assert(ref.equals(this.cardChallenge), "Pseudo-random card challenge does not match Kenc");
	}
}



/**
 * Set the sequence number for pseudo-random card challenges
 *
 * @param {ByteString} cnt the last used counter value
 */
GPSCP03.prototype.setSequenceCounter = function(cnt) {
	assert(cnt instanceof ByteString, "Argument cnt must be ByteString");
	assert(cnt.length == 3, "Argument cnt must be 3 bytes long");
	this.sequenceCounter = cnt;
}



/**
 * Set the key version and protocol parameter
 *
 * @param {Number} version the key version indicated in INITIALIZE_UPDATE
 * @param {Number} parami the i parameter for the SCP03 protocol (Default '00')
 */
GPSCP03.prototype.setKeyInfo = function(version, parami) {
	assert(typeof(version) == "number", "Argument version must be of type number");
	if (typeof(parami) != "undefined") {
		this.parami = parami;
	}
	this.keyVersion = version;
	this.keyInformation = ByteString.valueOf(this.keyVersion).concat(ByteString.valueOf(0x03)).concat(ByteString.valueOf(this.parami));
}



/**
 * Determine random or pseudo-random card challenge
 *
 */
GPSCP03.prototype.determineCardChallenge = function() {
	if (typeof(this.sequenceCounter) == "undefined") {
		this.cardChallenge = this.crypto.generateRandom(8);
	} else {
		var cnt = this.sequenceCounter.toUnsigned() + 1;
		this.sequenceCounter = ByteString.valueOf(cnt, 3);
		var context = this.sequenceCounter.concat(this.aid);
		this.cardChallenge = this.deriveKey(this.kenc, 2, 8, context);
	}
}



/**
 * Handle processing of INITIALIZE UPDATE command
 *
 * @param {ByteString} hostCryptogram the cryptogram calculated at the host
 */
GPSCP03.prototype.handleInitializeUpdate = function(hostChallenge) {
	this.hostChallenge = hostChallenge;
	this.determineCardChallenge();

	this.diversificationData = new ByteString("0102030405060708090A", HEX);

	if (typeof(this.keyInformation) == "undefined") {
		this.keyInformation = new ByteString("010300", HEX);
	}

	this.deriveSessionKeys();
	var context = this.hostChallenge.concat(this.cardChallenge);
	this.cardCryptogram = this.deriveKey(this.skmac, 0, 8, context);

	this.seclevel = 1;
	this.chaining = ByteString.valueOf(0, 16);

	var bb = new ByteBuffer();
	bb.append(this.diversificationData);
	bb.append(this.keyVersion);
	bb.append(0x03);
	bb.append(this.parami);
	bb.append(this.cardChallenge);
	bb.append(this.cardCryptogram);
	if (this.sequenceCounter != undefined) {
		bb.append(this.sequenceCounter);
	}
	return bb.toByteString();
}



/**
 * Issue EXTERNAL AUTHENTICATE command to card.
 *
 * @param {Card} card the card to use
 * @param {Number} level the security level (a combination of bits B5 (R-ENC), B4 (R-MAC), B2 (C-ENC) and B1 (C-MAC))
 * @param {ByteString} hostCryptogram optional parameter, calculated internally if missing
 */
GPSCP03.prototype.externalAuthenticate = function(card, level, hostCryptogram) {
	assert(card instanceof Card, "Argument card must be instance of Card");
	assert(typeof(level) == "number", "Argument level must be a number");
	assert((level & ~0x33) == 0, "Argument level must use only bits B5,B4,B2 or B1");
	assert((hostCryptogram == undefined) || (hostCryptogram instanceof ByteString), "hostCryptogram must be missing or ByteString");

	if (hostCryptogram == undefined) {
		this.calculateHostCryptogram();
	} else {
		this.hostCryptogram = hostCryptogram;
	}
	this.seclevel = 1;

	card.sendSecMsgApdu(Card.ALL, 0x80, 0x82, level, 0x00, this.hostCryptogram, [0x9000]);
	this.seclevel = level;
	this.enccnt = 1;
}



/**
 * Handle processing of PUT KEY command
 *
 * @param {ByteString} cdata the C-Data field of the APDU
 */
GPSCP03.prototype.handlePutKey = function(cdata) {
	var version = cdata.byteAt(0);
	cdata = cdata.bytes(1);
	var kd = GPSCP03.parseKeyDataField(cdata);
	var kenc = this.validateKeyBlock(kd);
	cdata = cdata.bytes(kd.length);

	var kd = GPSCP03.parseKeyDataField(cdata);
	var kmac = this.validateKeyBlock(kd);
	cdata = cdata.bytes(kd.length);

	var kd = GPSCP03.parseKeyDataField(cdata);
	var kdek = this.validateKeyBlock(kd);

	this.keyVersion = version;
	this.kenc = kenc;
	this.kmac = kmac;
	this.kdek = kdek;
}



/**
 * Derive S-ENC, S-MAC and S-RMAC session keys
 */
GPSCP03.prototype.deriveSessionKeys = function() {
	var context = this.hostChallenge.concat(this.cardChallenge);

	var keysize = this.kmac.getSize() >> 3;

	// Derive S-MAC
	var ss = this.deriveKey(this.kmac, 6, keysize, context);
	this.skmac = new Key();
	this.skmac.setComponent(Key.AES, ss);

	// Derive S-RMAC
	var ss = this.deriveKey(this.kmac, 7, keysize, context);
	this.skrmac = new Key();
	this.skrmac.setComponent(Key.AES, ss);

	// Derive S-ENC
	var ss = this.deriveKey(this.kenc, 4, keysize, context);
	this.skenc = new Key();
	this.skenc.setComponent(Key.AES, ss);
}



/**
 * Verify card cryptogram
 *
 * @type boolean
 * @return true if cryptogram is valid
 */
GPSCP03.prototype.verifyCardCryptogram = function() {
	var context = this.hostChallenge.concat(this.cardChallenge);

	var ss = this.deriveKey(this.skmac, 0, 8, context);
	return ss.equals(this.cardCryptogram);
}



/**
 * Calculate host cryptogram using the key derive method
 *
 * @type ByteString
 * @return the 8 byte cryptogram
 */
GPSCP03.prototype.calculateHostCryptogram = function() {
	var context = this.hostChallenge.concat(this.cardChallenge);

	this.hostCryptogram = this.deriveKey(this.skmac, 1, 8, context);
	return this.hostCryptogram;
}



/**
 * Encrypt key and prepare key block for PUT KEY command
 *
 * @param {Key} dek the data encryption key
 * @param {Key} key the key to wrap
 * @type ByteString
 * @return the key type, length, cryptogram and key check value
 */
GPSCP03.prototype.prepareKeyBlock = function(dek, key) {
	assert(dek instanceof Key, "Argument dek must be instance of Key");
	assert(key instanceof Key, "Argument key must be instance of Key");

	var keysize = key.getSize() >> 3;
	var ones = new ByteString("01010101010101010101010101010101", HEX);
	var kcv = this.crypto.encrypt(key, Crypto.AES_ECB, ones).left(3);

	var iv = ByteString.valueOf(0, 16);
	var ck = this.crypto.encrypt(dek, Crypto.AES_CBC, key.getComponent(Key.AES), iv);
	var ckbin = new ByteBuffer("88", HEX);
	ckbin.append(keysize + 1);
	ckbin.append(keysize);
	ckbin.append(ck);
	ckbin.append(3);
	ckbin.append(kcv);

	return ckbin.toByteString();
}



/**
 * Extract a key data field from C-Data in a PUT KEY APDU
 *
 * @param {ByteString} keyDataField the list of key data fields
 * @type ByteString
 * @return the extracted key data
 */
GPSCP03.parseKeyDataField = function(keyDataField) {
	var i = keyDataField.byteAt(1);
	if (i - 1 != keyDataField.byteAt(2)) {
		throw new GPError(module.id, GPError.INVALID_DATA, APDU.SW_INVDATA, "Field length does not match");
	}
	i += 2;
	i += keyDataField.byteAt(i) + 1;
	return keyDataField.left(i);
}



/**
 * Decrypt and validate key blob containing AES key wrapped with DEK
 *
 * @param {ByteString} keyblob the wrapped key
 * @type Key
 * @return the unwrapped key
 */
GPSCP03.prototype.validateKeyBlock = function(keyblob) {
	assert(keyblob instanceof ByteString, "Argument keyblob must be instance of ByteString");

	if (keyblob.byteAt(0) != 0x88) {
		throw new GPError(module.id, GPError.INVALID_DATA, APDU.SW_INVDATA, "AES key blob must start with '88'");
	}

	var l = keyblob.byteAt(1);
	if (keyblob.length <= l + 2) {
		throw new GPError(module.id, GPError.INVALID_DATA, APDU.SW_INVDATA, "Length exceeds key blob");
	}

	var kcvlen = keyblob.byteAt(3 + l - 1);
	var ck = keyblob.bytes(3, l - 1);
	var iv = ByteString.valueOf(0, 16);
	var plain = this.crypto.decrypt(this.kdek, Crypto.AES_CBC, ck, iv);

	var key = new Key();
	key.setComponent(Key.AES, plain);

	var ones = new ByteString("01010101010101010101010101010101", HEX);
	var kcv = this.crypto.encrypt(key, Crypto.AES_ECB, ones).left(kcvlen);

	if (!keyblob.right(3).equals(kcv)) {
		throw new GPError(module.id, GPError.CRYPTO_FAILED, APDU.SW_SECSTATNOTSAT, "KCV does not match");
	}
	return key;
}



/**
 * Derive a session key or cryptogram
 *
 * @param {Key} key the master key
 * @param {Number} ddc the data derivation constant
 * @param {Number} size the size of byte of the resulting key or cryptogram
 * @param {ByteString} context the context (usually hostChallenge || cardChallenge)
 * @return the derived value
 * @type ByteString
 */
GPSCP03.prototype.deriveKey = function(key, ddc, size, context) {
	assert(key instanceof Key, "Argument key must be instance of Key");
	assert(typeof(ddc) == "number", "Argument ddc must be a number");
	assert(typeof(size) == "number", "Argument size must be a number");
	assert(context instanceof ByteString, "Argument context must be instance of ByteString");

	var dd = new ByteBuffer();
	var os = size;
	var iter = 1;
	while (os > 0) {
		var dp = new ByteBuffer();
		dp.append(ByteString.valueOf(ddc, 12));
		dp.append(0);
		dp.append(ByteString.valueOf(size << 3, 2));
		dp.append(ByteString.valueOf(iter));
		dp.append(context);

		var mac = this.crypto.sign(key, Crypto.AES_CMAC, dp.toByteString());

		dd.append(mac.left(os > mac.length ? mac.length : os));
		os -= mac.length;
		iter++;
	}
	return dd.toByteString();
}



GPSCP03.test = function() {
	var crypto = new Crypto();

	var kmac = new Key();
	kmac.setComponent(Key.AES, new ByteString("404142434445464748494a4b4c4d4e4f", HEX));

	var kenc = new Key();
	kenc.setComponent(Key.AES, new ByteString("404142434445464748494a4b4c4d4e4f", HEX));

	var kdek = new Key();
	kdek.setComponent(Key.AES, new ByteString("404142434445464748494a4b4c4d4e4f", HEX));

	var card = new Card(_scsh3.reader);

	card.sendApdu(0x00, 0xA4, 0x04, 0x00, new ByteString("A000000151000000", HEX));

	var scp = new GPSCP03(crypto, kenc, kmac, kdek);

	scp.initializeUpdate(card, 0, 0);
	scp.deriveSessionKeys();
	assert(scp.verifyCardCryptogram());
	card.setCredential(scp);
	scp.externalAuthenticate(card, 1);

	var aid = new ByteString("E82B0601040181C31F0202", HEX);
	var cdata = (new ASN1(0x4F, aid)).getBytes();

	card.sendSecMsgApdu(Card.ALL, 0x80, 0xE4, 0x00, 0x80, cdata, [0x9000, 0x6A88]);
	card.sendSecMsgApdu(Card.ALL, 0x80, 0xE4, 0x00, 0x80, cdata, 0, [0x9000, 0x6A88]);
}
