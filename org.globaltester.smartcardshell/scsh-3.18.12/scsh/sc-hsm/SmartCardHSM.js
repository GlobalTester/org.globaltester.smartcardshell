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
 * @fileoverview SmartCard-HSM Card Service
 */

// Imports
var CVC = require("scsh/eac/CVC").CVC;
var PublicKeyReference = require("scsh/eac/PublicKeyReference").PublicKeyReference;
var ChipAuthentication = require("scsh/eac/ChipAuthentication").ChipAuthentication;
var PKCS1 = require("scsh/pkcs/PKCS1").PKCS1;
var DKEK = require("scsh/sc-hsm/DKEK").DKEK;



/**
 * Create a SmartCard-HSM access object
 * @class Class implementing support for SmartCard-HSM access
 * @constructor
 * @param {Card} card the card object
 */
function SmartCardHSM(card) {
	this.card = card;

	this.maxCAPDU = 1232;			// APDU buffer limit in JCOP 3
	this.maxRAPDU = 1232;
	this.limitedAPDUTransport = false;	// The APDU transport does not support the full response side

	if (card.readerName.indexOf("Secure Flash Card") == 0) {
		this.maxCAPDU = 478;
		this.maxRAPDU = 506;
		this.limitedAPDUTransport = true;
	} else if (card.readerName.indexOf("REINER SCT cyberJack") == 0) {
		this.maxCAPDU = 1014;
		this.maxRAPDU = 1014;
		this.limitedAPDUTransport = true;
	} else if (card.readerName.indexOf("ACS APG8201") == 0) {
		this.maxCAPDU = 1141;
		this.maxRAPDU = 1141;
		this.limitedAPDUTransport = true;
	} else if (card.readerName.indexOf("Gemalto IDBridge") == 0) {
		this.maxCAPDU = 262;
		this.maxRAPDU = 499;
		this.limitedAPDUTransport = true;
	}

	if (typeof(this.card.maxReaderCAPDU) != "undefined") {
		if (this.card.maxReaderCAPDU < this.maxCAPDU) {
			this.maxCAPDU = this.card.maxReaderCAPDU;
			this.limitedAPDUTransport = true;
		}
	}

	if (typeof(this.card.maxReaderRAPDU) != "undefined") {
		if (this.card.maxReaderRAPDU < this.maxRAPDU) {
			this.maxRAPDU = this.card.maxReaderRAPDU;
			this.limitedAPDUTransport = true;
		}
	}

	// 9 Byte CLA|INS|P1|P2|LcEx||LeEx
	// 19 Byte SM overhead (Tag 85, 3 byte length, 1 byte padding indicator, tag 97 02 <Le> and tag 8E 08 <mac>
	// 1 byte required for padding
	this.maxCData = Math.floor((this.maxCAPDU - 9 - 19) / 16) * 16 - 1;
//	print("maxCData=" + this.maxCData);

	// 19 Byte SM overhead (Tag 85, 3 byte length, 1 byte padding indicator, tag 99 02 SW1SW2 and tag 8E 08 <mac>
	// 2 byte SW1/SW2
	// 1 byte required for padding
	this.maxRData = Math.floor((this.maxRAPDU - 18 - 2) / 16) * 16 - 1;
//	print("maxRData=" + this.maxRData);

	this.useExternalHashInECDSA = false;	// Disable hashing in card if affected by bug #93

	// Check if SmartCard-HSM is already selected and authenticated
	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x20, 0x00, 0x81, 0);

	if (this.card.SW != 0x9000) {
		this.logout();		// Select application
	}

	this.namemap = [];
	this.idmap = [];
}

exports.SmartCardHSM = SmartCardHSM;


SmartCardHSM.C_DevAut = new ByteString("2F02", HEX);
SmartCardHSM.EF_TokenInfo = new ByteString("2F03", HEX);
SmartCardHSM.EF_StaticTokenInfo = new ByteString("CB00", HEX);

SmartCardHSM.PrK_DevAut = 0;
SmartCardHSM.PIN_User = 0x81;

SmartCardHSM.PRKDPREFIX = 0xC4;
SmartCardHSM.CERTDPREFIX = 0xC8;
SmartCardHSM.KEYMETAPREFIX = 0xCB;	// Changed in V2.3
SmartCardHSM.READONLYDATAPREFIX = 0xCB;	// Starting with V2.3
SmartCardHSM.KEYPREFIX = 0xCC;
SmartCardHSM.CONFIDENTIALDATAPREFIX = 0xCD;
SmartCardHSM.EECERTIFICATEPREFIX = 0xCE;
SmartCardHSM.CACERTIFICATEPREFIX = 0xCA;

SmartCardHSM.ALGORITHMS = [];

// Symmetric
SmartCardHSM.ALG_CBC_ENC = 0x10;
SmartCardHSM.ALG_CBC_DEC = 0x11;
SmartCardHSM.ALG_CMAC = 0x18;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_CBC_ENC] = "CBC_ENC";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_CBC_DEC] = "CBC_DEC";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_CMAC] = "CMAC";


// RSA Block
SmartCardHSM.ALG_RSA_SIGN_RAW = 0x20;
SmartCardHSM.ALG_RSA_DECRYPT_RAW = 0x21;
SmartCardHSM.ALG_RSA_DECRYPT_V15 = 0x22;
SmartCardHSM.ALG_RSA_DECRYPT_OAEP = 0x23;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_SIGN_RAW] = "RSA_RAW";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_DECRYPT_RAW] = "RSA_DECRYPT_RAW";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_DECRYPT_V15] = "RSA_DECRYPT_V15";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_DECRYPT_OAEP] = "RSA_DECRYPT_OAEP";


// RSA Sign with hash and PKCS#1 V1.5
SmartCardHSM.ALG_RSA_SIGN_V15_SHA1 = 0x31;
SmartCardHSM.ALG_RSA_SIGN_V15_SHA256 = 0x33;
SmartCardHSM.ALG_RSA_SIGN_V15_SHA512 = 0x35;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_SIGN_V15_SHA1] = "RSA_V15_SHA1";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_SIGN_V15_SHA256] = "RSA_V15_SHA256";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_SIGN_V15_SHA512] = "RSA_V15_SHA512";


// RSA Sign with hash and PSS
SmartCardHSM.ALG_RSA_SIGN_PSS = 0x40;
SmartCardHSM.ALG_RSA_SIGN_PSS_SHA1 = 0x41;
SmartCardHSM.ALG_RSA_SIGN_PSS_SHA256 = 0x43;
SmartCardHSM.ALG_RSA_SIGN_PSS_SHA512 = 0x45;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_SIGN_PSS] = "RSA_PSS";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_SIGN_PSS_SHA1] = "RSA_PSS_SHA1";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_SIGN_PSS_SHA256] = "RSA_PSS_SHA256";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_RSA_SIGN_PSS_SHA512] = "RSA_PSS_SHA512";


// ECDSA
SmartCardHSM.ALG_ECDSA = 0x70;
SmartCardHSM.ALG_ECDSA_SHA1 = 0x71;
SmartCardHSM.ALG_ECDSA_SHA224 = 0x72;
SmartCardHSM.ALG_ECDSA_SHA256 = 0x73;
SmartCardHSM.ALG_ECDSA_SHA384 = 0x74;
SmartCardHSM.ALG_ECDSA_SHA512 = 0x75;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDSA] = "ECDSA";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDSA_SHA1] = "ECDSA_SHA1";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDSA_SHA224] = "ECDSA_SHA224";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDSA_SHA256] = "ECDSA_SHA256";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDSA_SHA384] = "ECDSA_SHA384";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDSA_SHA512] = "ECDSA_SHA512";


// ECDH
SmartCardHSM.ALG_ECDH = 0x80;
SmartCardHSM.ALG_ECDHAutPuk = 0x83;
SmartCardHSM.ALG_ECDHXKEK = 0x84;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDH] = "ECDH";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDHAutPuk] = "ECDH_AUTPUK";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_ECDHXKEK] = "ECDH_XKEK";


// Wrap
SmartCardHSM.ALG_WRAP = 0x92;
SmartCardHSM.ALG_UNWRAP = 0x93;
SmartCardHSM.ALG_REPLACE = 0x94;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_WRAP] = "WRAP";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_UNWRAP] = "UNWRAP";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_REPLACE] = "REPLACE";


// Derive
SmartCardHSM.ALG_DERIVE_EC_KEY = 0x98;
SmartCardHSM.ALG_DERIVE_SP800_56C = 0x99;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_DERIVE_EC_KEY] = "DERIVE_EC";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_DERIVE_SP800_56C] = "DERIVE_SP800_56C";


SmartCardHSM.ALG_SIGN_DEFAULT = 0xA0;
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_SIGN_DEFAULT] = "SIGN_DEFAULT";


// Key Generation
SmartCardHSM.ALG_GENERATE_AES128 = 0xB0;
SmartCardHSM.ALG_GENERATE_AES192 = 0xB1;
SmartCardHSM.ALG_GENERATE_AES256 = 0xB2;

SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_GENERATE_AES128] = "GENERATE_AES128";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_GENERATE_AES192] = "GENERATE_AES192";
SmartCardHSM.ALGORITHMS[SmartCardHSM.ALG_GENERATE_AES256] = "GENERATE_AES256";


SmartCardHSM.ALGOMAP = {};
for (var i = 0; i < SmartCardHSM.ALGORITHMS.length; i++) {
	var name = SmartCardHSM.ALGORITHMS[i];
	if (typeof(name) != "undefined") {
		SmartCardHSM.ALGOMAP[name] = i;
	}
}


SmartCardHSM.rootCerts = {
	DESRCACC100001: new CVC(new ByteString("7F218201B47F4E82016C5F290100420E44455352434143433130303030317F4982011D060A04007F000702020202038120A9FB57DBA1EEA9BC3E660A909D838D726E3BF623D52620282013481D1F6E537782207D5A0975FC2C3057EEF67530417AFFE7FB8055C126DC5C6CE94A4B44F330B5D9832026DC5C6CE94A4B44F330B5D9BBD77CBF958416295CF7E1CE6BCCDC18FF8C07B68441048BD2AEB9CB7E57CB2C4B482FFC81B7AFB9DE27E1E3BD23C23A4453BD9ACE3262547EF835C3DAC4FD97F8461A14611DC9C27745132DED8E545C1D54C72F0469978520A9FB57DBA1EEA9BC3E660A909D838D718C397AA3B561A6F7901E0E82974856A78641046D025A8026CDBA245F10DF1B72E9880FFF746DAB40A43A3D5C6BEBF27707C30F6DEA72430EE3287B0665C1EAA6EAA4FA26C46303001983F82BD1AA31E03DA0628701015F200E44455352434143433130303030317F4C10060B2B0601040181C31F0301015301C05F25060102010100095F24060302010100085F37409DBB382B1711D2BAACB0C623D40C6267D0B52BA455C01F56333DC9554810B9B2878DAF9EC3ADA19C7B065D780D6C9C3C2ECEDFD78DEB18AF40778ADF89E861CA", HEX)),
	UTSRCACC100001: new CVC(new ByteString("7F218201B47F4E82016C5F290100420E55545352434143433130303030317F4982011D060A04007F000702020202038120A9FB57DBA1EEA9BC3E660A909D838D726E3BF623D52620282013481D1F6E537782207D5A0975FC2C3057EEF67530417AFFE7FB8055C126DC5C6CE94A4B44F330B5D9832026DC5C6CE94A4B44F330B5D9BBD77CBF958416295CF7E1CE6BCCDC18FF8C07B68441048BD2AEB9CB7E57CB2C4B482FFC81B7AFB9DE27E1E3BD23C23A4453BD9ACE3262547EF835C3DAC4FD97F8461A14611DC9C27745132DED8E545C1D54C72F0469978520A9FB57DBA1EEA9BC3E660A909D838D718C397AA3B561A6F7901E0E82974856A7864104A041FEB2FD116B2AD19CA6B7EACD71C9892F941BB88D67DCEEC92501F070011957E22122BA6C2CF5FF02936F482E35A6129CCBBA8E9383836D3106879C408EF08701015F200E55545352434143433130303030317F4C10060B2B0601040181C31F0301015301C05F25060102010100095F24060302010100085F3740914DD0FA00615C44048D1467435400423A4AD1BD37FD98D6DE84FD8037489582325C72956D4FDFABC6EDBA48184A754F37F1BE5142DD1C27D66569308CE19AAF", HEX))
}

SmartCardHSM.devAutPuk = new Key();
SmartCardHSM.devAutPuk.setType(Key.PUBLIC);
SmartCardHSM.devAutPuk.setComponent(Key.ECC_CURVE_OID, new ByteString("brainpoolP256r1", OID));
SmartCardHSM.devAutPuk.setComponent(Key.ECC_QX, new ByteString("4C01EA36C5065FF47E8F0676A77CDCED6C8F745E6784F7807F5520124F81ED05", HEX));
SmartCardHSM.devAutPuk.setComponent(Key.ECC_QY, new ByteString("4112DCE471CA003442830A10C75B31F9BFADD60628F47131628C7254AD8B956A", HEX));



/**
 * Remove Root Certificate of Development SRCA
 *
 * Always call this on a productive system
 */
SmartCardHSM.disableUTSRCA = function() {
	delete SmartCardHSM.rootCerts.UTSRCACC100001;
}



/**
 * Parse list of CVC in a binary blob
 *
 * @param {ByteString} a binary blob (e.g an EF) containing concatenated CVCs
 * @type CVC[]
 * @return the list of CVCs
 */
SmartCardHSM.parseCertificateList = function(bin) {
	var a = new ASN1((new ASN1(0x30, bin)).getBytes());
	var list = [];
	for (var i = 0; i < a.elements; i++) {
		list.push(new CVC(a.get(i)));
	}
	return list;
}



/**
 * Validate device certificate chain
 *
 * @param {Crypto} crypto the crypto provider to use
 * @param {ByteString} devAutCert the device certificate chain read from EF.C_DevAut
 * @type Key
 * @return the device authentication public key
 */
SmartCardHSM.validateCertificateChain = function(crypto, devAutCert) {
	// Device device certificate
	var cvc = new CVC(devAutCert);
	GPSystem.trace("Device Certificate    : " + cvc);

	if (cvc.getCAR().toString() == "DECA00001") {		// CA used for development version up to 0.17
		if (typeof(SmartCardHSM.rootCerts.UTSRCACC100001) == "undefined") {
			GPSystem.trace("Device certificate DECA00001 disabled");
			return null;
		}
		if (!cvc.verifyWith(crypto, SmartCardHSM.devAutPuk)) {
			GPSystem.trace("Device certificate verification failed for CAR=DECA00001");
			return null;
		}
		var path = "/" + cvc.getCAR().getHolder() + "/" + cvc.getCHR().getHolder();
		return { devicecert: cvc, publicKey:cvc.getPublicKey(), path:path };
	}

	// Decode device issuer certificate
	var len = cvc.getASN1().size;
	var cvc = new CVC(devAutCert.left(len));
	var dica = new CVC(devAutCert.bytes(len));
	GPSystem.trace("Device Issuer CA      : " + dica);

	if (typeof(SmartCardHSM.rootCerts[dica.getCAR()]) == "undefined") {
		GPSystem.trace("Unknown or disabled root CA " + dica.getCAR());
		return null;
	}

	// Determine root certificateSmartCardHSM.rootCerts[dica.getCAR()]
	var srca = SmartCardHSM.rootCerts[dica.getCAR()];
	GPSystem.trace("SmartCard-HSM Root CA : " + srca);

	// Validate chain
	var srcapuk = srca.getPublicKey();
	var oid = srca.getPublicKeyOID();
	if (!dica.verifyWith(crypto, srcapuk, oid)) {
		GPSystem.trace("DICA certificate not verified");
		return null;
	}

	var dicapuk = dica.getPublicKey(srcapuk);
	if (!cvc.verifyWith(crypto, dicapuk, oid)) {
		GPSystem.trace("Device certificate verification failed");
		return null;
	}

	var path = "/" + srca.getCHR().getHolder() + "/" + dica.getCHR().getHolder() + "/" + cvc.getCHR().getHolder();
	return { srca: srca, dica: dica, devicecert: cvc, publicKey:cvc.getPublicKey(srcapuk), path:path };
}



/**
 * Decode algorithm list and return string array with names
 *
 * @param {ByteString} list the algorithm list, e.g. as returned in the key meta data
 * @type String[]
 * @return the list of algorithm names
 */
SmartCardHSM.decodeAlgorithmList = function(list) {
	var a = [];
	for (var i = 0; i < list.length; i++) {
		a.push(SmartCardHSM.ALGORITHMS[list.byteAt(i)]);
	}

	return a;
}



/**
 * Parse and encode the algorithm list containing either algorithm ids or names
 *
 * @param {String | String[]} list the list of algorithms
 * @type ByteString
 * @return the algorithm list
 */
SmartCardHSM.encodeAlgorithmList = function(list) {
	if (typeof(list) == "string") {
		if (list.indexOf(".") != -1) {
			list = list.split(".");
		} else {
			list = list.split(",");
		}
	}

	var bb = new ByteBuffer();

	for (var i = 0; i < list.length; i++) {
		var e = list[i].trim();
		var id = NaN;
		if (e.length == 2) {
			id = parseInt(e, 16);
		}
		if (isNaN(id)) {
			var id = SmartCardHSM.ALGOMAP[e.toUpperCase()];
			if (typeof(id) == "undefined") {
				print("Unknown keyword or number " + list[i]);
				return null;
			}
		}
		bb.append(id);
	}

	return bb.toByteString();
}



/**
 * Return a string describing the SmartCard-HSM Version
 *
 * @type String
 * @return the version string
 */
SmartCardHSM.prototype.getVersionInfo = function() {
	if (typeof(this.major) == "undefined") {
		return "Version unknown";
	}

	var str = "Version " + this.major + "." + this.minor;

	if (typeof(this.platform) != "undefined") {
		switch(this.platform) {
			case 0: str += " on JCOP"; break;
			case 1: str += " Demo on JCOP"; break;
			case 2: str += " on JCOP 2.4.1r3"; break;
			case 3: str += " on JCOP 2.4.2r3"; break;
			case 4: str += " on JCOP 2.4.2r1"; break;
			case 5: str += " on JCOP 3"; break;
			case 6: str += " on JCOP 4"; break;
		}
	}
	return str;
}



/**
 * Return the native OCF SmartCardHSMCardService
 *
 * @type de.cardcontact.opencard.service.smartcardhsm.SmartCardHSMCardService
 * @return the OCF SmartCardHSMCardService
 */
SmartCardHSM.prototype.getNativeCardService = function() {
	if (this.nativeCardService) {
		return this.nativeCardService;
	}
	this.nativeCardService = this.card.getCardService("de.cardcontact.opencard.service.smartcardhsm.SmartCardHSMCardService");

	return this.nativeCardService;
}



/**
 * Validate device certificate chain
 *
 * @param {Crypto} crypto the crypto provider to use
 * @type Key
 * @return the device authentication public key
 */
SmartCardHSM.prototype.validateCertificateChain = function(crypto) {
	// Read concatenation of both certificates
	var devAutCert = this.readBinary(SmartCardHSM.C_DevAut);
	var chain = SmartCardHSM.validateCertificateChain(crypto, devAutCert);
	if (chain == null) {
		return null;
	}
	return chain.publicKey;
}



/**
 * Open a secure channel using device authentication
 *
 * @param {Crypto} crypto the crypto provider to use
 * @param {Key} devAuthPK the device authentication public key
 * @param {Number} Key.AES or Key.DES to request AES or DES secure messaging (Default probe)
 * @type ISOSecureChannel
 * @return the initialized secure channel
 */
SmartCardHSM.prototype.openSecureChannel = function(crypto, devAuthPK, smtype) {

	var type;

	if (smtype) {
		type = smtype;
	} else {
		type = Key.AES;
	}

	if (type == Key.DES) {
		var protocol = new ByteString("id-CA-ECDH-3DES-CBC-CBC", OID);
	} else {
		var protocol = new ByteString("id-CA-ECDH-AES-CBC-CMAC-128", OID);
	}

	// Try AES first and fallback to DES is not supported by card

	var bb = new ByteBuffer();
	bb.append(new ASN1(0x80, protocol).getBytes());

	this.card.sendSecMsgApdu(Card.CPRO|Card.CENC|Card.RPRO, 0x00, 0x22, 0x41, 0xA4, bb.toByteString(), [0x9000, 0x6A80]);

	if (this.card.SW == 0x6A80) {
		if (smtype) {
			throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 3, "Requested secure messaging not supported");
		}

		type = Key.DES;

		var protocol = new ByteString("id-CA-ECDH-3DES-CBC-CBC", OID);

		var bb = new ByteBuffer();
		bb.append(new ASN1(0x80, protocol).getBytes());

		this.card.sendSecMsgApdu(Card.CPRO|Card.CENC|Card.RPRO, 0x00, 0x22, 0x41, 0xA4, bb.toByteString(), [0x9000]);
	}

	var ca = new ChipAuthentication(crypto, protocol, devAuthPK);	// For domain parameter
	ca.noPadding = true;
	ca.generateEphemeralCAKeyPair();

	var ephemeralPublicKeyIfd = ca.getEphemeralPublicKey();

	var dado = new ASN1(0x7C, new ASN1(0x80, ephemeralPublicKeyIfd));

	var dadobin = this.card.sendSecMsgApdu(Card.CPRO|Card.CENC|Card.RPRO|Card.RENC, 0x00, 0x86, 0x00, 0x00, dado.getBytes(), 0, [0x9000]);

//	GPSystem.trace(dadobin);

	var dado = new ASN1(dadobin);
	assert(dado.tag == 0x7C);
	assert(dado.elements == 2);
	var nonceDO = dado.get(0);
	assert(nonceDO.tag == 0x81);
	var nonce = nonceDO.value;

	var authTokenDO = dado.get(1);
	assert(authTokenDO.tag == 0x82);
	var authToken = authTokenDO.value;

	var enc = new ByteString("04", HEX);
	enc = enc.concat(devAuthPK.getComponent(Key.ECC_QX));
	enc = enc.concat(devAuthPK.getComponent(Key.ECC_QY));

	GPSystem.trace("Encoded CA public key: " + enc);
	ca.performKeyAgreement(enc, nonce);
	var result = ca.verifyAuthenticationToken(authToken);

	if (!result) {
		GPSystem.trace("Authentication token invalid");
		throw new Error("Authentication token invalid");
	}
	GPSystem.trace("Authentication token valid");

	if (type == Key.DES) {
		var sm = new IsoSecureChannel(crypto);
		sm.setEncKey(ca.kenc);
		sm.setMacKey(ca.kmac);
		sm.setMACSendSequenceCounter(new ByteString("0000000000000000", HEX));
	} else {
		var sm = new IsoSecureChannel(crypto, IsoSecureChannel.SSC_SYNC_ENC_POLICY);
		sm.setEncKey(ca.kenc);
		sm.setMacKey(ca.kmac);
		sm.setMACSendSequenceCounter(new ByteString("00000000000000000000000000000000", HEX));
	}

	this.card.setCredential(sm);
	this.smactive = true;
	return sm;
}



/**
 * Update transparent EF referenced by file identifier
 *
 * @param {ByteString} fid the two byte file identifier
 * @param {Number} offset the offset into the EF
 * @param {ByteString} data the data to write
 */
SmartCardHSM.prototype.updateBinary = function(fid, offset, data) {
	if (typeof(offset) == "undefined") {
		offset = 0;
	}

	var bytesLeft = data.length;
	var sent = 0;

	// 8 bytes are required for T54(4) and T53(4)
	var blksize = this.maxCData - 8;

	while (bytesLeft > 0) {
		var toSend = bytesLeft >= blksize ? blksize : bytesLeft;

		var t54 = new ASN1(0x54, ByteString.valueOf(offset, 2));
		var t53 = new ASN1(0x53, data.bytes(sent, toSend));

		var cdata = t54.getBytes().concat(t53.getBytes());
		this.card.sendSecMsgApdu(Card.ALL, 0x00, 0xD7, fid.byteAt(0), fid.byteAt(1), cdata, [0x9000]);

		bytesLeft -= toSend;
		offset += toSend;
		sent += toSend;
	}
}



/**
 * Read transparent EF referenced by file identifier
 *
 * @param {ByteString} fid the two byte file identifier (optional - use currently selected EF if absent)
 * @param {Number} offset the offset into the EF (optional)
 * @param {Number} length the number of byte to read (optional)
 * @type ByteString
 * @return the data read from the EF
 */
SmartCardHSM.prototype.readBinary = function(fid, offset, length) {
	if (typeof(offset) == "undefined") {
		offset = 0;
	}
	if (typeof(fid) == "undefined") {
		fid = new ByteString("0000", HEX);
	}

	var rsp = new ByteBuffer();
	do	{
		var t54 = new ASN1(0x54, ByteString.valueOf(offset, 2));

		if (length || this.limitedAPDUTransport || this.smactive) {				// Is a length defined ?
			var le = (!length || (length > this.maxRData)) ? this.maxRData: length;		// Truncate if larger than maximum APDU size ?
		} else {
			var le = this.maxRAPDU <= 256 ? 0 : 65536;					// Get all with Le=0 in either short or extended APDU mode
		}

		var data = this.card.sendSecMsgApdu(Card.ALL, 0x00, 0xB1, fid.byteAt(0), fid.byteAt(1), t54.getBytes(), le, [0x9000, 0x6282]);

		if (data.length == 0) {
			break;
		}

		rsp.append(data);
		offset += data.length;

		if (length) {					// Length was defined, see if we already got everything
			length -= data.length;
			if (length <= 0) {
				break;
			}
		}
	} while ((this.card.SW == 0x9000) || (this.card.SW == 0x6282));

	return rsp.toByteString();
}



/**
 * Select the file or key an return the FCP
 *
 * @param {ByteString} fid the two byte file object identifier
 */
SmartCardHSM.prototype.selectFile = function(fid) {
	var fcp = this.card.sendSecMsgApdu(Card.ALL, 0x00, 0xA4, 0x00, 0x04, fid, 0, [0x9000]);
	return fcp;
}



/**
 * Try selecting the file to see if is present
 *
 * @param {ByteString} fid the two byte file object identifier
 */
SmartCardHSM.prototype.hasFile = function(fid) {
	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0xA4, 0x00, 0x04, fid, 0);
	return this.card.SW == 0x9000;
}



/**
 * Delete file system object (EF or key)
 *
 * @param {ByteString} fid the two byte file object identifier
 */
SmartCardHSM.prototype.deleteFile = function(fid) {
	return this.card.sendSecMsgApdu(Card.ALL, 0x00, 0xE4, 0x02, 0x00, fid, [0x9000]);
}



/**
 * Strips leading zeros of a ByteString
 *
 * @param {ByteString} value the ByteString value
 * @return the stripped ByteString object, may be an empty ByteString
 * @type ByteString
 */
SmartCardHSM.stripLeadingZeros = function(value) {
	var i = 0;
	for (; (i < value.length) && (value.byteAt(i) == 0); i++);

	return value.right(value.length - i);
}



/**
 * Build input for Generate Asymmetric Key Pair command for generating an ECC key pair
 *
 * @param {PublicKeyReference} innerCAR the CA the request shall be directed to
 * @param {ByteString} algo the public key algorithm
 * @param {PublicKeyReference} chr the certificate holder reference associated with this key
 * @param {Key} dp the domain parameter for the key
 * @param {PublicKeyReference} outerCAR the certificate holder reference of the public key for verifying the outer signature
 * @param {Key} privateKey optional parameter to supply a private key value for import. This only works with the development version
 *              of the SmartCard-HSM.
 * @type ByteString
 * @return the encoded C-Data for GENERATE ASYMMETRIC KEY PAIR
 */
SmartCardHSM.buildGAKPwithECC = function(innerCAR, algo, chr, dp, outerCAR, priKey) {

	// Encode G
	var bb = new ByteBuffer();
	// uncompressed encoding
	bb.append(new ByteString("04", HEX));
	bb.append(dp.getComponent(Key.ECC_GX));
	bb.append(dp.getComponent(Key.ECC_GY));
	var G = bb.toByteString();

	var t = new ASN1(0x30,
				new ASN1("CPI", 0x5F29, new ByteString("00", HEX)),
				new ASN1("CAR", 0x42, innerCAR.getBytes()),
				new ASN1("Public Key", 0x7F49,
					new ASN1("Object Identifier", 0x06, algo),
					new ASN1("Prime Modulus", 0x81, dp.getComponent(Key.ECC_P)),
					new ASN1("First coefficient a", 0x82, dp.getComponent(Key.ECC_A)),
					new ASN1("Second coefficient b", 0x83, dp.getComponent(Key.ECC_B)),
					new ASN1("Base Point G", 0x84, G),
					new ASN1("Order of the base point", 0x85, dp.getComponent(Key.ECC_N)),
					new ASN1("Cofactor f", 0x87, SmartCardHSM.stripLeadingZeros(dp.getComponent(Key.ECC_H)))
				),
				new ASN1("CHR", 0x5F20, chr.getBytes())
			);

	if (typeof(outerCAR) != "undefined") {
		t.add(new ASN1("OuterCAR", 0x45, outerCAR.getBytes()));
	}

	if (priKey != undefined) {
		var d = new ASN1("Private Key", 0x8A, priKey.getComponent(Key.ECC_D));
		t.get(2).add(d);
//		GPSystem.trace(t);
	}
	return t.value;
}



/**
 * Build input for Generate Asymmetric Key Pair command for generating a RSA key pair
 *
 * @param {PublicKeyReference} innerCAR the CA the request shall be directed to
 * @param {ByteString} algo the public key algorithm
 * @param {PublicKeyReference} chr the certificate holder reference associated with this key
 * @param {Number} keysize the module size in bits (1024, 1536 or 2048)
 * @param {PublicKeyReference} outerCAR the certificate holder reference of the public key for verifying the outer signature
 * @type ByteString
 * @return the encoded C-Data for GENERATE ASYMMETRIC KEY PAIR
 */
SmartCardHSM.buildGAKPwithRSA = function(innerCAR, algo, chr, keysize, outerCAR) {

	var t = new ASN1(0x30,
				new ASN1("CPI", 0x5F29, new ByteString("00", HEX)),
				new ASN1("CAR", 0x42, innerCAR.getBytes()),
				new ASN1("Public Key", 0x7F49,
					new ASN1("Object Identifier", 0x06, algo),
					new ASN1("Public Key Exponent", 0x82, ByteString.valueOf(65537)),
					new ASN1("Key Size", 0x02, ByteString.valueOf(keysize))
				),
				new ASN1("CHR", 0x5F20, chr.getBytes())
			);

	if (typeof(outerCAR) != "undefined") {
		t.add(new ASN1("OuterCAR", 0x45, outerCAR.getBytes()));
	}
	return t.value;
}



/**
 * Create a PKCS#15 PrivateECCKey description
 *
 * @param {Number/ByteString} keyid the key identifier
 * @param {String} label the key label
 * @type ASN1
 * @return the PrivateECCKey description
 */
SmartCardHSM.buildPrkDforECC = function(keyid, label, keysize) {
	if (typeof(keyid) == "number") {
		keyid = ByteString.valueOf(keyid);
	}

	var prkd = 	new ASN1(0xA0,
					new ASN1(ASN1.SEQUENCE,
						new ASN1(ASN1.UTF8String, new ByteString(label, UTF8))
//						new ASN1(ASN1.BIT_STRING, new ByteString("0780", HEX)),
//						new ASN1(ASN1.OCTET_STRING, new ByteString("01", HEX))
					),
					new ASN1(ASN1.SEQUENCE,
						new ASN1(ASN1.OCTET_STRING, keyid),
						new ASN1(ASN1.BIT_STRING, new ByteString("072080", HEX))
					),
					new ASN1(0xA1,
						new ASN1(ASN1.SEQUENCE,
							new ASN1(ASN1.SEQUENCE,
								new ASN1(ASN1.OCTET_STRING, new ByteString("", HEX))
							)
						)
					)
				);

	if (keysize != undefined) {
		assert(keysize > 0, "Key size must be > 0");
		var tlvint = ByteString.valueOf(keysize);
		if (tlvint.byteAt(0) >= 0x80) {
			tlvint = (new ByteString("00", HEX)).concat(tlvint);
		}
		prkd.get(2).get(0).add(new ASN1(ASN1.INTEGER, tlvint));
	}

//	GPSystem.trace(prkd);
	return prkd;
}



/**
 * Create a PKCS#15 PrivateRSAKey description
 *
 * @param {Number/ByteString} keyid the key identifier
 * @param {String} label the key label
 * @param {Number} modulussize
 * @type ASN1
 * @return the PrivateECCKey description
 */
SmartCardHSM.buildPrkDforRSA = function(keyid, label, modulussize) {
	if (typeof(keyid) == "number") {
		keyid = ByteString.valueOf(keyid);
	}

	var prkd = 	new ASN1(0x30,
					new ASN1(ASN1.SEQUENCE,
						new ASN1(ASN1.UTF8String, new ByteString(label, UTF8))
//						new ASN1(ASN1.BIT_STRING, new ByteString("0780", HEX)),
//						new ASN1(ASN1.OCTET_STRING, new ByteString("01", HEX))
					),
					new ASN1(ASN1.SEQUENCE,
						new ASN1(ASN1.OCTET_STRING, keyid),
						new ASN1(ASN1.BIT_STRING, new ByteString("0274", HEX))
					),
					new ASN1(0xA1,
						new ASN1(ASN1.SEQUENCE,
							new ASN1(ASN1.SEQUENCE,
								new ASN1(ASN1.OCTET_STRING, new ByteString("", HEX))
							),
							new ASN1(ASN1.INTEGER, ByteString.valueOf(modulussize))
						)
					)
				);
//	GPSystem.trace(prkd);
	return prkd;
}



/**
 * Create a PKCS#15 SecretKey description
 *
 * @param {Number/ByteString} keyid the key identifier
 * @param {String} label the key label
 * @param {Number} keysize
 * @type ASN1
 * @return the secret key description
 */
SmartCardHSM.buildSKDforAES = function(keyid, label, keysize) {
	if (typeof(keyid) == "number") {
		keyid = ByteString.valueOf(keyid);
	}

	var skd =
		new ASN1(0xA8,
			// CommonObjectAttributes
			new ASN1(ASN1.SEQUENCE,
				new ASN1(ASN1.UTF8String, new ByteString(label, UTF8))
				//						new ASN1(ASN1.BIT_STRING, new ByteString("0780", HEX)),
				//						new ASN1(ASN1.OCTET_STRING, new ByteString("01", HEX))
			),
			// ClassAttributes: CommonKeyAttributes
			new ASN1(ASN1.SEQUENCE,
				new ASN1(ASN1.OCTET_STRING, keyid),
				new ASN1(ASN1.BIT_STRING, new ByteString("07C010", HEX))
			),
			// SubClassAttribute: CommonSecretKeyAttributes
			new ASN1(0xA0,
				new ASN1(ASN1.SEQUENCE,
					new ASN1(ASN1.INTEGER, ByteString.valueOf(keysize, 2))
				)
			),
			new ASN1(0xA1,
				new ASN1(ASN1.SEQUENCE,
					new ASN1(ASN1.SEQUENCE,
						new ASN1(ASN1.OCTET_STRING, new ByteString("", HEX))
					)
				)
			)

		);
//	GPSystem.trace(skd);
	return skd;
}



/**
 * Create a PKCS#15 certificate description
 *
 * @param {ByteString} commonObjectFlags default value is '0640'
 * @param {String} label the key label
 * @param {Key} pubKey the public key
 * @param {ByteString} certFID the file identifier of the certificate
 * @type ASN1
 * @return the PrivateECCKey description
 */
SmartCardHSM.buildCertDescription = function(label, commonObjectFlags, pubKey, certFID) {
	if (!commonObjectFlags) {
		commonObjectFlags = new ByteString("0x0640", HEX);
	}

	// generate subject key id
	var qx = pubKey.getComponent(Key.ECC_QX)
	if (qx) {
	  var enc = qx;
	} else {
	  var enc = pubKey.getComponent(Key.MODULUS);
	}
	var crypto = new Crypto();
	var subjectKeyID = crypto.digest(Crypto.SHA_1, enc);

	var desc = 	new ASN1(ASN1.SEQUENCE,
				new ASN1(ASN1.SEQUENCE,			// common object attributes
					new ASN1(ASN1.UTF8String, new ByteString(label, UTF8)),
					new ASN1(ASN1.BIT_STRING, commonObjectFlags)
				),
				new ASN1(ASN1.SEQUENCE,			// common certificate attributes
					  new ASN1(ASN1.OCTET_STRING, subjectKeyID)
				),
				new ASN1(0xA1,					// type attributes
					new ASN1(ASN1.SEQUENCE,			// x.509 certificate attributes
						new ASN1(ASN1.SEQUENCE,			// path
							new ASN1(ASN1.OCTET_STRING, certFID)
						)
					)
				)
			);
	return desc;
}



/**
 * Dump C-Data of Generate Asymmetric Key Pair command
 *
 * @param {ByteString} keydata the content of C-Data
 */
SmartCardHSM.dumpKeyData = function(keydata) {
	GPSystem.trace(keydata);
	var a = new ASN1(0x30, keydata);
	var a = new ASN1(a.getBytes());
	for (var i = 0; i < a.elements; i++) {
		GPSystem.trace(a.get(i));
	}
}



/**
 * Generate an asymmetric key pair
 *
 * @param {Number} newkid key identifier for new key
 * @param {Number} signkid key identifier for signing the new public key
 * @param {ByteString} keydata the key data template
 * @type ByteString
 * @return the certificate signing request containing the new public key
 */
SmartCardHSM.prototype.generateAsymmetricKeyPair = function(newkid, signkid, keydata) {

	if (!this.limitedAPDUTransport) { // Use extended length
		var rsp = this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x46, newkid, signkid, keydata, 65536, [0x9000]);
	} else {
		this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x46, newkid, signkid, keydata, [0x9000]);
		var rsp = this.readBinary(ByteString.valueOf(0xCE00 + newkid), 0);
	}

	return rsp;
}



/**
 * Generate a symmetric key
 *
 * @param {Number} newkid key identifier for new key
 * @param {Number} algo key generation algorithm
 * @param {ByteString} keydata the key data template
 * @type ByteString
 * @return
 */
SmartCardHSM.prototype.generateSymmetricKey = function(newkid, algo, keydata) {

	var rsp = this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x48, newkid, algo, keydata, 0, [0x9000]);
	return rsp;
}



/**
 * Return true is SmartCard-HSM is initialized
 *
 * @type Boolean
 * @return true if initialized
 */
SmartCardHSM.prototype.isInitialized = function() {
	var sw = this.queryUserPINStatus();
	if ((sw == 0x6984) || (sw == 0x6A88)) {		// V1.2: Not initialized / V2.0: Transport PIN
		var sw = this.queryInitializationCodeStatus();
		if (sw == 0x6A88) {
			return false;
		}
	}
	return true;
}



/**
 * Initialize device and clear all keys and files
 *
 * @param {ByteString} options two byte option mask
 * @param {ByteString} initialPIN initial user PIN value
 * @param {ByteString} initializationCode secret code for device initialization (set during first use)
 * @param {Number} retryCounterInitial retry counter for user PIN
 * @param {Number} keyshares number of device key encryption key shares (optional)
 */
SmartCardHSM.prototype.initDevice = function(options, initialPIN, initializationCode, retryCounterInitial, keyshares) {
	var s = new ASN1(0x30,
				new ASN1(0x80, options),
				new ASN1(0x81, initialPIN),
				new ASN1(0x82, initializationCode),
				new ASN1(0x91, ByteString.valueOf(retryCounterInitial))
				);

	if (typeof(keyshares) != "undefined") {
		s.add(new ASN1(0x92, ByteString.valueOf(keyshares)));
	}
	this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x50, 0x00, 0x00, s.value, [0x9000]);
}



/**
 * Determine free memory
 *
 * @type Number
 * @return the number of available bytes (this values is capped to 32767 on JCOP 2.4.1)
 */
SmartCardHSM.prototype.getFreeMemory = function() {
	var rsp = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x50, 0x00, 0x00, 0, [0x9000, 0x6700]);

	if (this.card.SW != 0x9000) {
		return -1;
	}

	this.options = rsp.bytes(0, 2).toUnsigned();
	this.major = rsp.byteAt(rsp.length - 2);
	this.minor = rsp.byteAt(rsp.length - 1);
	this.platform = rsp.byteAt(rsp.length - 3);
	return rsp.bytes(rsp.length - 7, 4).toUnsigned();
}



/**
 * Check if the RESET RETRY COUNTER command is enabled
 *
 * @type Boolean
 * @return true if enable during initialization
 */
SmartCardHSM.prototype.isResetRetryCounterEnabled = function() {
	if (typeof(this.options) == "undefined") {
		this.getFreeMemory();
	}
	return (this.options & 1) == 1;
}



/**
 * Check if the RESET RETRY COUNTER command can reset the PIN
 *
 * @type Boolean
 * @return true if enable during initialization
 */
SmartCardHSM.prototype.isPINResetEnabled = function() {
	if (typeof(this.options) == "undefined") {
		this.getFreeMemory();
	}
	return (this.options & 0x20) == 0;
}



/**
 * Parse the key domain status returned from the device
 *
 * @param {ByteString} status the R-DATA from the MANAGE KEY DOMAIN command
 * @type object
 * @return the decoded status Info
 */
SmartCardHSM.prototype.parseKeyDomainStatus = function(status) {
	if (status.length == 0) {
		return { sw: this.card.SW };
	}

	var statusObject = {
		sw: this.card.SW,
		shares: status.byteAt(0),
		outstanding: status.byteAt(1),
		kcv: status.bytes(2, 8)
	}

	if (status.length > 10) {
		statusObject.keyDomain = status.bytes(10);
	}

	return statusObject;
}



/*
 * Create DKEK Key Domain
 *
 * @param {Number} keyDomain number of key domain in the range 0 to the maximum defined in the INITIALIZE DEVICE command
 * @param {Number} shares the number of DKEK shares to import
 * @type Object
 * @return object with properties sw{Number}, shares{Number}, outstanding{Number} and kcv{ByteString}
 */
SmartCardHSM.prototype.createDKEKKeyDomain = function(keyDomain, shares) {
	if (typeof(keyDomain) != "number") {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyDomain must be a number");
	}
	if (typeof(shares) != "number") {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "shares must be a number");
	}

	var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x01, keyDomain, ByteString.valueOf(shares), 0);

	return this.parseKeyDomainStatus(status);
}



/**
 * Create XKEK Key Domain
 *
 * @param {Number} keyDomain number of key domain in the range 0 to the maximum defined in the INITIALIZE DEVICE command
 * @param {ByteString} keyDomainMembership either a 64 byte signature (old format) or a encoded TLV object with tag 54 or 55
 * @return object with properties sw{Number}, shares{Number}, outstanding{Number}, kcv{ByteString} and the key domain UID{ByteString}
 * @type Object
 */
SmartCardHSM.prototype.createXKEKKeyDomain = function(keyDomain, groupSignerPublicKey, keyDomainMembership) {
	if (typeof(keyDomain) != "number") {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyDomain must be a number");
	}
	if ((keyDomain < 0) || (keyDomain > 0xFF)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyDomain must be between 0 and 255");
	}
	if (!(groupSignerPublicKey instanceof CVC)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "groupSignerPublicKey must be a CVC instance");
	}
	if (!(keyDomainMembership instanceof ByteString)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyDomainMembership must be a ByteString");
	}

	var car = groupSignerPublicKey.getOuterCAR().getBytes();

	var pukrefdo = new ASN1(0x83, car);
	var pukref = pukrefdo.getBytes();

	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x22, 0x81, 0xB6, pukref, [0x9000]);

	if (keyDomainMembership.length == 64) {
		keyDomainMembership = new ASN1(0x53, keyDomainMembership).getBytes();
	}
	var cdata = groupSignerPublicKey.getASN1().value.concat(keyDomainMembership);

	if (cdata.length <= this.maxCData) {
		var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x02, keyDomain, cdata, 0);
	} else {
		this.updateBinary(ByteString.valueOf(0x2F10), 0, cdata);
		var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x02, keyDomain, 0);
	}

	return this.parseKeyDomainStatus(status);
}



/**
 * Associate XKEK Key Domain
 *
 * @param {Number} keyDomain number of key domain in the range 0 to the maximum defined in the INITIALIZE DEVICE command
 * @param {ByteString} keyDomainUID a encoded TLV object with tag 51 containing the key domain uid of the associated domain
 * @param {ByteString} keyDomainAssociation a encoded TLV object with tag 56 or 57
 * @return object with properties sw{Number}, shares{Number}, outstanding{Number}, kcv{ByteString} and the key domain UID{ByteString}
 * @type Object
 */
SmartCardHSM.prototype.associateXKEKKeyDomain = function(keyDomain, groupSignerPublicKey, keyDomainUID, keyDomainAssociation) {
	if (typeof(keyDomain) != "number") {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyDomain must be a number");
	}
	if ((keyDomain < 0) || (keyDomain > 0xFF)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyDomain must be between 0 and 255");
	}
	if (!(groupSignerPublicKey instanceof CVC)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "groupSignerPublicKey must be a ByteString");
	}
	if (!(keyDomainUID instanceof ByteString)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyDomainUID must be a ByteString");
	}
	if (!(keyDomainAssociation instanceof ByteString)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyDomainAssociation must be a ByteString");
	}

	var car = groupSignerPublicKey.getOuterCAR().getBytes();

	var pukrefdo = new ASN1(0x83, car);
	var pukref = pukrefdo.getBytes();

	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x22, 0x81, 0xB6, pukref, [0x9000]);

	var cdata = groupSignerPublicKey.getASN1().value.concat(keyDomainUID).concat(keyDomainAssociation);

	if (cdata.length <= this.maxCData) {
		var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x05, keyDomain, cdata, 0);
	} else {
		this.updateBinary(ByteString.valueOf(0x2F10), 0, cdata);
		var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x05, keyDomain, 0);
	}

	return this.parseKeyDomainStatus(status);
}



/**
 * Derive XKEK
 *
 * @param {Number} keyDomain number of key domain in the range 0 to the maximum defined in the INITIALIZE DEVICE command
 * @param {ByteString} derivationParam
 * @return object with properties sw{Number}, shares{Number}, outstanding{Number}, kcv{ByteString} and the key domain UID{ByteString}
 * @type Object
 */
SmartCardHSM.prototype.deriveXKEK = function(keyid, peerPublicKey, derivationParam) {
	if (typeof(keyid) != "number") {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyid must be a number");
	}
	if ((keyid < 1) || (keyid > 0xFF)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "keyid must be between 1 and 255");
	}
	if (!(peerPublicKey instanceof CVC)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "peerPublicKey must be a CVC");
	}
	if (!(derivationParam instanceof ByteString)) {
		throw new GPError("SmartCardHSM", GPError.INVALID_DATA, 1, "derivationParam must be a ByteString");
	}

	var car = peerPublicKey.getOuterCAR().getBytes();

	var pukrefdo = new ASN1(0x83, car);
	var pukref = pukrefdo.getBytes();

	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x22, 0x81, 0xB6, pukref, [0x9000]);

	var kdp = new ASN1(0x50, derivationParam).getBytes();
	var cdata = peerPublicKey.getASN1().value.concat(kdp);

	if (cdata.length <= this.maxCData) {
		// Le is usually not required, but versions 3.1 to 3.3 fail without Le (#178)
		this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x62, keyid, 0x84, cdata, 0, [0x9000]);
	} else {
		this.updateBinary(ByteString.valueOf(0x2F10), 0, cdata);
		this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x62, keyid, 0x84, [0x9000]);
	}
}



/**
 * Query the status of the key domain
 *
 * @param {Number} keyDomain the number of the key domain which will be queried, default is 0
 * @type Object
 * @return object with properties sw{Number}, shares{Number}, outstanding{Number}, kcv{ByteString} and for a XKEK key domain the key domain UID{ByteString}
 */
SmartCardHSM.prototype.queryKeyDomainStatus = function(keyDomain) {
	if (!keyDomain) {
		keyDomain = 0;
	}

	var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x00, keyDomain, 0);

	return this.parseKeyDomainStatus(status);
}



/**
 * Delete the key encryption key in a key domain
 *
 * @param {Number} keyDomain the number of the key domain
 */
SmartCardHSM.prototype.deleteKEK = function(keyDomain) {
	var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x04, keyDomain, [0x9000]);

	return this.parseKeyDomainStatus(status);
}



/**
 * Delete the empty key domain
 *
 * @param {Number} keyDomain the number of the key domain
 */
SmartCardHSM.prototype.deleteKeyDomain = function(keyDomain) {
	this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x03, keyDomain, [0x9000]);
}



/**
 * Import DKEK share or query status
 *
 * @param {Number} keyDomain the number of the key domain
 * @param {ByteString} keyshare 32 byte key share
 * @type Object
 * @return object with properties sw{Number}, shares{Number}, outstanding{Number} and kcv{ByteString}
 */
SmartCardHSM.prototype.importKeyShare = function(keyDomain, keyshare) {
	if (typeof(keyDomain) != "number") {
		keyshare = keyDomain;
		keyDomain = 0;
	}
	if (typeof(keyshare) != "undefined") {
		var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x00, keyDomain, keyshare, 0, [0x9000]);
	} else {
		var status = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x52, 0x00, keyDomain, 0);
	}
	if (status.length == 0) {
		return { sw: this.card.SW };
	}

	var statusObject = {
		sw: this.card.SW,
		shares: status.byteAt(0),
		outstanding: status.byteAt(1),
		kcv: status.bytes(2, 8)
	}

	if (status.length > 10) {
		statusObject.keyDomain = status.bytes(10);
	}

	return statusObject;
}



/**
 * Decrypt and import a DKEK share
 *
 * @param {ByteString} keyshare the encrypted key share as read from the .pbe file
 * @param {ByteString} password the password
 * @param {Number} keyDomain the number of the key domain
 * @return object with properties sw{Number}, shares{Number}, outstanding{Number} and kcv{ByteString}
 */
SmartCardHSM.prototype.importEncryptedKeyShare = function(keyshare, password, keyDomain) {
	if (typeof(keyDomain) == "undefined") {
		keyDomain = 0;
	}

	var dkek = DKEK.decryptKeyShare(keyshare, password);
//	print("Importing into SmartCard-HSM");
	var r = this.importKeyShare(keyDomain, dkek);
	dkek.clear();
	return r;
}



/**
 * Wrap key under DKEK
 *
 * @param {Number} id key id
 * @type ByteString
 * @return key blob with encrypted key value
 */
SmartCardHSM.prototype.wrapKey = function(id) {
	var keyblob = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x72, id, 0x92, 65536, [0x9000]);
	return keyblob;
}



/**
 * Unwrap key with DKEK
 *
 * @param {Number} id key id
 * @param {ByteString} keyblob the wrapped key
 */
SmartCardHSM.prototype.unwrapKey = function(id, keyblob) {
	if (keyblob.length < this.maxCData) {
		this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x74, id, 0x93, keyblob, [0x9000]);
	} else {
		this.updateBinary(ByteString.valueOf(0x2F10), 0, keyblob);
		this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x74, id, 0x93, [0x9000]);
	}
}



/**
 * Replace symmetric key value encrypted under current key
 *
 * @param {Number} id key id
 * @param {ByteString} keyblob the wrapped key
 */
SmartCardHSM.prototype.unwrapAndReplaceKey = function(id, keyblob) {
	this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x74, id, 0x94, keyblob, [0x9000]);
}



/**
 * Derive Symmetric Key
 *
 * @param {Number} id key id
 * @param {Number} algo algorithm id (one of ALG_CBC_ENC, ALG_CBC_DEC, ALG_CMAC or ALG_DERIVE_SP800_56C)
 * @param {ByteString} derivationParam the derivation parameter
 * @type ByteString
 * @return derived key value
 */
SmartCardHSM.prototype.deriveSymmetricKey = function(id, algo, derivationParam) {
	var derivedKeyValue = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x78, id, algo, derivationParam, 0, [0x9000]);
	return derivedKeyValue;
}



/**
 * Verify User PIN
 *
 * @param {ByteString} userPIN user PIN value
 * @return the status word SW1/SW2 returned by the device
 */
SmartCardHSM.prototype.verifyUserPIN = function(userPIN) {
	if (userPIN) {
		this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x20, 0x00, 0x81, userPIN);
		return this.card.SW;
	} else {
		var cs = this.getNativeCardService();
		cs.verifyPassword();
		return this.queryUserPINStatus();
	}
}



/**
 * Logout
 *
 */
SmartCardHSM.prototype.logout = function() {
	this.card.clearCredential();
	var fcp = this.card.sendApdu(0x00, 0xA4, 0x04, 0x04, new ByteString("E82B0601040181C31F0201", HEX), 0, [0x9000]);
	var a = new ASN1(fcp);
	var v = a.find(0x85).value;
	this.options = v.bytes(0, 2).toUnsigned();
	this.major = v.byteAt(v.length - 2);
	this.minor = v.byteAt(v.length - 1);
	if (v.length >= 5) {
		this.platform = v.byteAt(v.length - 3);
	}
}



/**
 * Change User PIN
 *
 * @param {ByteString} currentPIN current user PIN value
 * @param {ByteString} newPIN new user PIN value
 */
SmartCardHSM.prototype.changeUserPIN = function(currentPIN, newPIN) {
	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x24, 0x00, 0x81, currentPIN.concat(newPIN), [0x9000]);
}



/**
 * Unblock and set User PIN
 *
 * @param {ByteString} initializationCode the initialization code
 * @param {ByteString} newPIN new user PIN value (optional)
 */
SmartCardHSM.prototype.unblockUserPIN = function(initializationCode, newPIN) {
	if (newPIN) {
		this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x2C, 0x00, 0x81, initializationCode.concat(newPIN), [0x9000]);
	} else {
		this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x2C, 0x01, 0x81, initializationCode, [0x9000]);
	}
}



/**
 * Change InitializationCode
 *
 * @param {ByteString} initializationCode current initialization code
 * @param {ByteString} newInitializationCode new initialization code
 */
SmartCardHSM.prototype.changeInitializationCode = function(initializationCode, newInitializationCode) {
	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x24, 0x00, 0x88, initializationCode.concat(newInitializationCode), [0x9000]);
}



SmartCardHSM.describePINStatus = function(sw, name) {
	var str;
	switch(sw) {
	case 0x9000:
		str = name + " authenticated";
		break;
	case 0x6984:
		str = name + " in transport mode or device not initialized";
		break;
	case 0x6A88:
		str = name + " not initialized";
		break;
	case 0x6983:
		str = name + " blocked";
		break;
	case 0x6300:
		str = name + " not authenticated";
		break;
	default:
		str = name + " not verified, " + (sw & 0xF) + " tries remaining";
		break;
	}
	return str + " (" + ByteString.valueOf(sw).toString(HEX) + ")";
}



/**
 * Request PIN Status Information
 *
 * @param {Number} p2 the PIN object id
 * @type Number
 * @return the status word SW1/SW2 returned by the device
 */
SmartCardHSM.prototype.queryPINStatus = function(p2) {
	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x20, 0x00, p2, 0);
	return this.card.SW;
}



/**
 * Request PIN Status Information
 *
 * @type Number
 * @return the status word SW1/SW2 returned by the device
 */
SmartCardHSM.prototype.queryUserPINStatus = function() {
	return this.queryPINStatus(0x81);
}



/**
 * Request Initialization Code Status
 *
 * @type Number
 * @return the status word SW1/SW2 returned by the device
 */
SmartCardHSM.prototype.queryInitializationCodeStatus = function() {
	return this.queryPINStatus(0x88);
}



/**
 * Enumerate Objects
 *
 * @return the enumeration
 */
SmartCardHSM.prototype.enumerateObjects = function() {
	var rsp = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x58, 0x00, 0x00, 65536, [0x9000]);
	return rsp;
}



/**
 * Generate random data
 *
 * @param {Number} length number of bytes
 * @return the random bytes
 */
SmartCardHSM.prototype.generateRandom = function(length) {
	var rsp = this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x84, 0x00, 0x00, length, [0x9000]);
	return rsp;
}



/**
 * Sign data using referenced key
 *
 * @param {Number} keyid the key identifier for signing
 * @param {algo} algo the algorithm identifier
 * @param {ByteString} data the data to be signed
 * @return the signature value
 */
SmartCardHSM.prototype.sign = function(keyid, algo, data) {
	if (data.length <= this.maxCData) {
		var rsp = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x68, keyid, algo, data, 0x10000, [0x9000]);
	} else {
		this.updateBinary(ByteString.valueOf(0x2F10), 0, data);
		var rsp = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x68, keyid, algo, 0x10000, [0x9000]);
	}

	return rsp;
}



/**
 * Decipher cryptogram or agree shared secret using Diffie-Hellman
 *
 * @param {Number} keyid the key identifier
 * @param {Number} algo the algorithm identifier
 * @param {ByteString} data the the cryptogram or concatenation of x || y of ECC public key
 * @return the plain output
 */
SmartCardHSM.prototype.decipher = function(keyid, algo, data) {
	var rsp = this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x62, keyid, algo, data, 0x00, [0x9000]);
	return rsp;
}



/**
 * Verify card verifiable certificate
 *
 * @param {CVC} cvc the card verifiable certificate
 **/
SmartCardHSM.prototype.verifyCertificate = function(cvc) {

	// Check if public key is already known
	var chr = cvc.getCHR().getBytes();

	var pukrefdo = new ASN1(0x83, chr);
	var pukref = pukrefdo.getBytes();

	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x22, 0x81, 0xB6, pukref, [0x9000, 0x6A88]);

	if (this.card.SW == 0x9000) {
		return;
	}

	// Select public key for verification
	var car = cvc.getCAR().getBytes();

	var pukrefdo = new ASN1(0x83, car);
	var pukref = pukrefdo.getBytes();

	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x22, 0x81, 0xB6, pukref, [0x9000]);

	// Extract value of 7F21
	var tl = new TLVList(cvc.getBytes(), TLV.EMV);
	var t = tl.index(0);
	var v = t.getValue();

	this.card.sendSecMsgApdu(Card.ALL, 0x00, 0x2A, 0x00, 0xBE, v, [0x9000]);
}



/**
 * Enumerate CA certificates
 *
 * @type String[]
 * @return the list of certificate labels
 */
SmartCardHSM.prototype.enumerateCACertificates = function() {
	this.canamemap = [];
	this.caidmap = []
	this.caids = [];
	var certlist = [];

	var fobs = this.enumerateObjects();

	// Process PKCS#15 certificate descriptions
	for (var i = 0; i < fobs.length; i+= 2) {
		if (fobs.byteAt(i) == SmartCardHSM.CERTDPREFIX) {
			var id = fobs.byteAt(i + 1);
			this.caids.push(id);
			var fid = ByteString.valueOf((SmartCardHSM.CACERTIFICATEPREFIX << 8) + id);
			var descbin = this.readBinary(fobs.bytes(i, 2));
			var asn = new ASN1(descbin);
			var coa = asn.get(0);
			if (coa.elements > 0) {
				var label = coa.get(0).value.toString(ASCII);
			} else {
				var label = "No label (" + i + ")";
			}
			var cert = this.readBinary(fid);
			certlist.push(label);
			this.canamemap[label] = cert;
			cert.id = id;
			this.caidmap[label] = id;
		}
	}

	return certlist;
}



/**
 * Return CA certificate with label
 *
 * @param {String} label the certificate label
 * @type ByteString
 * @return the encoded certificate
 */
SmartCardHSM.prototype.getCACertificate = function(label) {
	if (typeof(this.caids) == "undefined") {
		this.enumerateCACertificates();
	}

	return this.canamemap[label];
}



/**
 * Determine an unused CA certificate identifier
 *
 * @type Number
 * @return a free CA certificate identifier or -1 if all identifier in use
 */
SmartCardHSM.prototype.determineFreeCAId = function() {
	if (typeof(this.caids) == "undefined") {
		this.enumerateCACertificates();
	}

	if (this.caids.length == 0) {
		return 0;
	}

	var id = Math.max.apply(null, this.caids) + 1;
	if (id > 256) {
		return -1;
	}
	return id;
}



/**
 * Add a new CA certificate to the map
 *
 * @param {X509} cert the CA certificate
 * @param {Number} id the corresponding id
 * @param {String} label the corresponding label
 */
SmartCardHSM.prototype.addCACertificateToMap = function(cert, id, label) {
	if (!this.caidmap[label]) {
		// new id
		this.caids.push(id);
		this.caidmap[label] = id;
	}
	this.canamemap[label] = cert;
}



/**
 * Enumerate key objects in the SmartCard-HSM and build the map of keys
 *
 * @type String[]
 * @return the list of key labels
 */
SmartCardHSM.prototype.enumerateKeys = function() {
	this.namemap = [];
	this.idmap = [];
	this.idlist = [];
	this.p15idmap = [];

	var fobs = this.enumerateObjects();

	// Process keys
	for (var i = 0; i < fobs.length; i += 2) {
		if ((fobs.byteAt(i) == SmartCardHSM.KEYPREFIX) || (fobs.byteAt(i) == 0xFF)) {
			var kid = fobs.byteAt(i + 1);
			if (kid > 0) {
//				GPSystem.trace("Found key: " + kid);
				var key = new SmartCardHSMKey(this, kid);
				this.idmap[kid] = key;
				this.idlist.push(kid);
				this.updateKey(key);
			}
		}
	}

	var keylist = [];
	// Process PKCS#15 private key descriptions
	for (var i = 0; i < fobs.length; i += 2) {
		if (fobs.byteAt(i) == SmartCardHSM.PRKDPREFIX) {
			var kid = fobs.byteAt(i + 1);
			var descbin = this.readBinary(fobs.bytes(i, 2));
			if (descbin.length > 2) {
				try {
					var desc = new ASN1(descbin);
					if (desc.elements < 3) {
						continue;
					}
				}
				catch(e) {
					continue;
				}
				var key = this.idmap[kid];
				if (key) {
					key.setDescription(desc);
					var label = key.getLabel();
//					GPSystem.trace(key.getId() + " - " + label);
					if (label) {
						keylist.push(label);
						this.namemap[label] = key;
					}
					var p15id = key.getPKCS15Id();
					this.p15idmap[p15id.toString(HEX)] = key;
				}
			}
		}
	}

	return keylist;
}



/**
 * Get key ids
 *
 * @type Number[]
 * @return a list of key identifier
 */
SmartCardHSM.prototype.getKeyIds = function() {
	if (typeof(this.idlist) == "undefined") {
		this.enumerateKeys();
	}
	return this.idlist;
}



/**
 * Determine an unused key identifier
 *
 * @type Number
 * @return a free key identifier or -1 if all key identifier in use
 */
SmartCardHSM.prototype.determineFreeKeyId = function() {
	if (typeof(this.idlist) == "undefined") {
		this.enumerateKeys();
	}
	for (var i = 1; i < 256; i++) {
		if (this.idmap[i] == undefined) {
			return i;
		}
	}
	throw new GPError("SmartCardHSM", GPError.OUT_OF_MEMORY, 1, "Key idx exhausted");
}



/**
 * Update key attributes, in particular the use counter
 *
 * @param {HSMKey} key the HSM key
 */
SmartCardHSM.prototype.updateKey = function(key) {
	var fid = ByteString.valueOf((SmartCardHSM.KEYPREFIX << 8) + key.getId());
	try	{
		var fcp = this.selectFile(fid);
	}
	catch(e) {
		return;
	}
	var a = new ASN1(fcp);
	var pi = a.find(0xA5);
	if (!pi) {
		return;
	}
	var kc = pi.find(0x90);
	if (kc) {
		var c = kc.value.toUnsigned();

		if (c != 0xFFFFFFFF) {
			key.useCounter = c;
		}
	}

	var kd = pi.find(0x91);
	if (kd) {
		key.algorithms = kd.value;
	}

	var kd = pi.find(0x92);
	if (kd) {
		key.keyDomain = kd.value.toUnsigned();
	}
}



/**
 * Add a new key to the map of keys
 *
 * @param {HSMKey} key the HSM key
 */
SmartCardHSM.prototype.addKeyToMap = function(key) {
	var id = key.getId();
	this.idmap[id] = key;

	var label = key.getLabel();
	if (label) {
		this.namemap[label] = key;
	}

	var p15id = key.getPKCS15Id();
	if (p15id) {
		this.p15idmap[p15id.toString(HEX)] = key;
	}
}



/**
 * Get a key reference object
 *
 * @param {String/Number/ByteString} labelOrId label or id of key
 * @returns the key or null if not found
 * @type Key
 */
SmartCardHSM.prototype.getKey = function(labelOrId) {
	if (typeof(this.idlist) == "undefined") {
		this.enumerateKeys();
	}

	if (typeof(labelOrId) == "number") {
		var key = this.idmap[labelOrId];
	} else if (typeof(labelOrId) == "string") {
		var key = this.namemap[labelOrId];
	} else {
		var key = this.p15idmap[labelOrId.toString(HEX)];
	}

	if (key == undefined) {
		return null;
	}
	return key;
}



/**
 * Return a list of key objects
 *
 * @type SmartCardHSMKey[]
 * @return the list of keys
 */
SmartCardHSM.prototype.getKeys = function() {
	if (typeof(this.idlist) == "undefined") {
		this.enumerateKeys();
	}

	var keylist = [];
	for (var i in this.idmap) {
		keylist.push(this.idmap[i]);
	}
	return keylist;
}



/**
 * Get crypto object
 *
 * @type HSMCrypto
 * @return the HSMCrypto object
 */
SmartCardHSM.prototype.getCrypto = function() {
	if (this.crypto == undefined) {
		this.crypto = new SmartCardHSMCrypto(new Crypto());
	}
	return this.crypto;
}



/**
 * @private
 */
SmartCardHSM.prototype.getTokenInfo = function() {
	if (this.tokenInfo != undefined) {
		return this.tokenInfo;
	}

	if (!this.hasFile(SmartCardHSM.EF_TokenInfo)) {
		return;
	}

	var bin = this.readBinary(SmartCardHSM.EF_TokenInfo);
	this.tokenInfo = new ASN1(bin);
	return this.tokenInfo;
}



/**
 * Get Token Label
 *
 * @type String
 * @return the token label from CIAInfo
 */
SmartCardHSM.prototype.getLabel = function() {
	var ti = this.getTokenInfo();
	if (!ti) {
		return;
	}

	var a = ti.find(0x80);
	if (!a) {
		return;
	}
	return a.value.toString(UTF8);
}



/**
 * @private
 */
SmartCardHSM.prototype.getStaticTokenInfo = function() {
	if (this.staticTokenInfo != undefined) {
		return this.staticTokenInfo;
	}

	if (!this.hasFile(SmartCardHSM.EF_StaticTokenInfo)) {
		return;
	}

	var bin = this.readBinary(SmartCardHSM.EF_StaticTokenInfo);
	this.staticTokenInfo = new ASN1(bin);
	return this.staticTokenInfo;
}



/**
 * Get ProvisioningURL
 *
 * @type String
 * @return the configured ProvisioningURL or undefined
 */
SmartCardHSM.prototype.getProvisioningURL = function() {
	var ti = this.getStaticTokenInfo();
	if (!ti) {
		return;
	}

	var a = ti.find(0x80);
	if (!a) {
		return;
	}
	return a.value.toString(UTF8);
}



/**
 * Get Key Check Value of Token Management Key
 *
 * @type ByteString
 * @return the configured KCV of the Token Management Key or undefined
 */
SmartCardHSM.prototype.getTokenManagementKeyKCV = function() {
	var ti = this.getStaticTokenInfo();
	if (!ti) {
		return;
	}

	var a = ti.find(0x81);
	if (!a) {
		return;
	}
	return a.value;
}



/**
 * Get salt for SO-PIN derivation using  the Token Management Key
 *
 * @type ByteString
 * @return the configured salt
 */
SmartCardHSM.prototype.getTokenManagementKeySalt = function() {
	var ti = this.getStaticTokenInfo();
	if (!ti) {
		return;
	}

	var a = ti.find(0x82);
	if (!a) {
		return;
	}
	return a.value;
}



/**
 * Create crypto object implementing access to the SmartCard-HSM
 *
 * @class Wrapper to provide Crypto interface to SmartCard-HSM
 * @constructor
 * @param {Crypto} crypto the backend crypto provider
 */
function SmartCardHSMCrypto(crypto) {
	this.crypto = crypto;
}



/**
 * Sign a message using the defined mechanism and key
 *
 * @param {HSMKey} key the private key
 * @param {Number} mech the mechanism (e.g. Crypto.ECDSA)
 * @param {ByteString} message the message to be signed
 * @type ByteString
 * @return the signature
 */
SmartCardHSMCrypto.prototype.sign = function(key, mech, message) {
	if (key instanceof SmartCardHSMKey) {
		return key.sign(mech, message);
	} else {
		return this.crypto.sign(key, mech, message);
	}
}



/**
 * Decrypt a message using the defined mechanism and key
 *
 * @param {HSMKey} key the private key
 * @param {Number} mech the mechanism (e.g. Crypto.RSA_PKCS1)
 * @param {ByteString} data the cryptogram
 * @param {ByteString} iv the initialization vector for symmetric ciphers
 * @type ByteString
 * @return the plain text
 */
SmartCardHSMCrypto.prototype.decrypt = function(key, mech, data, iv) {
	if (key instanceof SmartCardHSMKey) {
		return key.decrypt(mech, data);
	} else {
		return this.crypto.decrypt(key, mech, data, iv);
	}
}



/**
 * Verify a message using the defined mechanism and key
 *
 * @param {Key} key the public key
 * @param {Number} mech the mechanism (e.g. Crypto.ECDSA)
 * @param {ByteString} message the message to be signed
 * @param {ByteString} signature the signature to verify
 * @type Boolean
 * @return true if signature is valid
 */
SmartCardHSMCrypto.prototype.verify = function(key, mech, message, signature) {
	return this.crypto.verify(key, mech, message, signature);
}



/**
 * Create a key access object
 *
 * @class Class implementing key access
 * @param {SmartCardHSM} sc the card access object
 * @param {Number} id the key identifier
 */
function SmartCardHSMKey(sc, id) {
	this.sc = sc;
	this.id = id;
	if (this.sc.useExternalHashInECDSA) {
		this.crypto = new Crypto();
	}
}

exports.SmartCardHSMKey = SmartCardHSMKey;


/**
 * Set the PKCS#15 private key description
 *
 * @param {ASN1} desc the description
 */
SmartCardHSMKey.prototype.setDescription = function(desc) {
	this.desc = desc;
}



/**
 * Return the key identifier
 *
 * @type Number
 * @return the key identifier
 */
SmartCardHSMKey.prototype.getId = function() {
	return this.id;
}



/**
 * Return the key label as encoded in the PKCS#15 structure
 *
 * @type String
 * @return the key label
 */
SmartCardHSMKey.prototype.getLabel = function() {
	if (this.desc == undefined) {
		return undefined;
	}
	if ((this.desc.get(0).elements == 0) || this.desc.get(0).get(0).tag != 0x0C) {
		return undefined;
	}

	return this.desc.get(0).get(0).value.toString(UTF8);
}



/**
 * Return the key id as encoded in the PKCS#15 structure
 *
 * @type ByteString
 * @return the key identifier
 */
SmartCardHSMKey.prototype.getPKCS15Id = function() {
	if (this.desc == undefined) {
		return undefined;
	}
	return this.desc.get(1).get(0).value;
}



/**
 * Return the key size in bits
 *
 * @type Number
 * @return the key size in bits
 */
SmartCardHSMKey.prototype.getSize = function() {
	if (this.desc == undefined) {
		return undefined;
	}
//	GPSystem.trace(this.desc);
	if (this.desc.get(2).elements > 1) {	// Fix a bug from early versions
		return this.desc.get(2).get(1).value.toUnsigned();
	} else {
		return this.desc.get(2).get(0).get(1).value.toUnsigned();
	}
}



/**
 * Return the key size in bits
 *
 * @type Number
 * @return the key size in bits
 */
SmartCardHSMKey.prototype.getType = function() {
	if (this.desc == undefined) {
		return undefined;
	}

	if (this.desc.tag == 0xA0) {
		return "EC";
	} else if (this.desc.tag == 0x30) {
		return "RSA";
	} else if (this.desc.tag == 0xA8) {
		return "AES";
	}

	return undefined;
}



/**
 * Sign data using a key in the SmartCard-HSM
 *
 * @param {Number} mech the signing mechanism
 * @param {ByteString} data to be signed
 * @type ByteString
 * @return the signature
 */
SmartCardHSMKey.prototype.sign = function(mech, data) {
	var algo;
	if (mech) {
		switch(mech) {
		case Crypto.RSA:
			algo = 0x20;
			break;
		case Crypto.RSA_SHA1:
			algo = 0x31;
			break;
		case Crypto.RSA_SHA256:
			algo = 0x33;
			break;
		case Crypto.RSA_PKCS1:
			algo = 0x20;
			var keysize = this.getSize();
			if (!keysize) {
				throw new GPError(module.id, GPError.INVALID_DATA, 0, "Can't determine key size");
			}
			data = PKCS1.encode_EMSA_V15(keysize, data);
			break;
//		case Crypto.RSA_PSS:
		case 0x80:
			algo = 0x40;
			break;
		case Crypto.RSA_PSS_SHA1:
			algo = 0x41;
			break;
		case Crypto.RSA_PSS_SHA256:
			algo = 0x43;
			break;
		case Crypto.ECDSA:
			algo = 0x70;
			break;
		case Crypto.ECDSA_SHA1:
			if (this.sc.useExternalHashInECDSA) {
				algo = 0x70;
				var data = this.crypto.digest(Crypto.SHA_1, data);
			} else {
				algo = 0x71;
			}
			break;
		case Crypto.ECDSA_SHA224:
			if (this.sc.useExternalHashInECDSA) {
				algo = 0x70;
				var data = this.crypto.digest(Crypto.SHA_224, data);
			} else {
				algo = 0x72;
			}
			break;
		case Crypto.ECDSA_SHA256:
			if (this.sc.useExternalHashInECDSA) {
				algo = 0x70;
				var data = this.crypto.digest(Crypto.SHA_256, data);
			} else {
				algo = 0x73;
			}
			break;
		case Crypto.AES_CMAC:
			return this.sc.deriveSymmetricKey(this.id, SmartCardHSM.ALG_CMAC, data);
		default:
			throw new GPError("SmartCardHSMKey", GPError.INVALID_DATA, mech, "Unsupported crypto mechanism");
		}
	}

	return this.sc.sign(this.id, algo, data);
}



/**
 * Decrypt data using a key in the SmartCard-HSM
 *
 * @param {Number} mech the decipher mechanism
 * @param {ByteString} data to be deciphered
 * @type ByteString
 * @return the plain message
 */
SmartCardHSMKey.prototype.decrypt = function(mech, data) {
	var algo;
	if (mech) {
		switch(mech) {
		case Crypto.RSA:
			break;
		case Crypto.RSA_PKCS1:
			break;
		case Crypto.RSA_OAEP_SHA224:
			algo = Crypto.SHA_224;
			break;
		case Crypto.RSA_OAEP_SHA256:
			algo = Crypto.SHA_256;
			break;
		case Crypto.RSA_OAEP_SHA384:
			algo = Crypto.SHA_384;
			break;
		case Crypto.RSA_OAEP_SHA512:
			algo = Crypto.SHA_512;
			break;
		default:
			throw new GPError("SmartCardHSMKey", GPError.INVALID_DATA, mech, "Unsupported crypto mechanism");
		}
	}

	var em = this.sc.decipher(this.id, 0x21, data);

	var plain = em;

	if (mech != Crypto.RSA) {
		if (mech == Crypto.RSA_PKCS1) {
			var plain = PKCS1.decode_EME_V15(em);
		} else {
			var crypto = this.sc.getCrypto().crypto;

			var plain = PKCS1.decode_EME_OAEP(crypto, null, algo, em);
		}

		if (!plain) {
			throw new GPError("SmartCardHSMKey", GPError.CRYPTO_FAILED, mech, "Decryption failed");
		}
	}

	return plain;
}



/**
 * Return human readable string
 */
SmartCardHSMKey.prototype.toString = function() {
	return "SmartCardHSMKey(id=" + this.id + ")";
}



/**
 * Initialize SmartCard-HSM
 *
 * @class Class implementing the device initialization methods
 * @param {Card} card the card object
 */
function SmartCardHSMInitializer(card) {
	this.card = card;
	this.initializationCode = new ByteString("57621880", ASCII);
	this.userPIN = new ByteString("648219", ASCII);
	this.userPINSet = false;
	this.useDefaultUserPIN = true;
	this.retryCounterInitial = 3;
	this.options = 0x0001;
	this.keyshares = -1;
	this.keyDomains = -1;
	this.numberOfPublicKeys = 0;
	this.requiredPublicKeysForAuthentication = 0;
	this.bioslot = [];
	this.label = undefined;
}

exports.SmartCardHSMInitializer = SmartCardHSMInitializer;



/**
 * Set the initialization code
 *
 * @param {ByteString} initializationCode an 8 byte code
 */
SmartCardHSMInitializer.prototype.setInitializationCode = function(initializationCode) {
	if (!(initializationCode instanceof ByteString)) {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "initializationCode must be a ByteString");
	}
	if (initializationCode.length != 8) {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "initializationCode must have 8 bytes");
	}

	this.initializationCode = initializationCode;
}



/**
 * Set the User PIN
 *
 * @param {ByteString} userPIN a 6 to 16 byte code
 */
SmartCardHSMInitializer.prototype.setUserPIN = function(userPIN) {
	if (!(userPIN instanceof ByteString)) {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "userPIN must be a ByteString");
	}
	if ((userPIN.length < 6) || (userPIN.length > 16)) {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "userPIN must be between 6 and 16 bytes");
	}

	this.userPIN = userPIN;
	this.userPINSet = true;
	this.useDefaultUserPIN = false;
}



/**
 * Set the retry counter
 *
 * The SmartCard-HSM enforces a retry counter <= 3 for PIN length 6
 * The SmartCard-HSM enforces a retry counter <= 5 for PIN length 7
 * The SmartCard-HSM enforces a retry counter <= 10 for PIN length larger than 7
 *
 * @param {Number} retryCounterInitial in the range 1 to 10.
 */
SmartCardHSMInitializer.prototype.setRetryCounterInitial = function(retryCounterInitial) {
	if (typeof(retryCounterInitial) != "number") {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "retryCounterInitial must be a number");
	}
	if ((retryCounterInitial < 1) || (retryCounterInitial > 10)) {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "retryCounterInitial must be between 1 and 10");
	}
	this.retryCounterInitial = retryCounterInitial;
}



/**
 * Set the number of DKEK shares
 *
 * @param {Number} keyshares number of DKEK shares in the range 0 to 255
 */
SmartCardHSMInitializer.prototype.setDKEKShares = function(keyshares) {
	if (typeof(keyshares) != "number") {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "keyshares must be a number");
	}
	if ((keyshares < 0) || (keyshares > 255)) {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "keyshares must be between 0 and 255");
	}
	this.keyshares = keyshares;
	this.keyDomains = -1;
}



/**
 * Set the number of key domains
 *
 * @param {Number} keyDomains number of key domains
 */
SmartCardHSMInitializer.prototype.setKeyDomains = function(keyDomains) {
	if (typeof(keyDomains) != "number") {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "keyDomains must be a number");
	}

	this.keyDomains = keyDomains;
	this.keyshares = -1;
}



/**
 * Enable or disable RESET RETRY COUNTER command
 *
 * @param {Boolean} enable true (default) to allow RESET RETRY COUNTER command to reset user PIN using the initialization code
 */
SmartCardHSMInitializer.prototype.setResetRetryCounterMode = function(enable) {
	if (typeof(enable) == "undefined") {
		var enable = false;
	}

	this.options = (this.options & 0xFFFE) + (enable ? 1 : 0);
}



/**
 * Enable or disable transport PIN mode
 *
 * @param {Boolean} enable true (non-default) to set user PIN to transport state
 */
SmartCardHSMInitializer.prototype.setTransportPINMode = function(enable) {
	if (typeof(enable) == "undefined") {
		var enable = true;
	}

	this.options = (this.options & 0xFFFD) + (enable ? 2 : 0);
}



/**
 * Enable or disable session PIN mode
 *
 * @param {Number} 0 - disable, 1 - enable with clear-on-reset 3 - enable with explicit clearing
 */
SmartCardHSMInitializer.prototype.setSessionPINMode = function(mode) {
	assert(typeof(mode) == "number", "Argument mode must be number");
	assert(mode >= 0 && mode <= 3 && mode != 2, "Argument mode must be 0, 1 or 3");

	this.options = (this.options & 0xFFF3) + (mode << 2);
}



/**
 * Enable or disable replacing of a PKA key
 *
 * @param {Boolean} enable true (non-default) to allow replacing of a PKA key
 */
SmartCardHSMInitializer.prototype.setReplacePKAKeyMode = function(enable) {
	if (typeof(enable) == "undefined") {
		var enable = false;
	}

	this.options = (this.options & 0xFFF7) + (enable ? 8 : 0);
}



/**
 * Enable the combined authentication mode of user pin and public key authentication.
 *
 * @param {Boolean} enable true (non-default) to require public key authentication and user authentication
 */
SmartCardHSMInitializer.prototype.setCombinedAuthenticationMode = function(enable) {
	if (typeof(enable) == "undefined") {
		var enable = false;
	}

	this.options = (this.options & 0xFFEF) + (enable ? 16 : 0);
}



/**
 * If enabled RESET RETRY COUNTER only resets the error counter.
 * Otherwise  RRC allows changing the PIN
 *
 * @param {Boolean} resetOnly true to only reset the error counter, false otherwise (default)
 */
SmartCardHSMInitializer.prototype.setResetRetryCounterResetOnlyMode = function(resetOnly) {
	if (typeof(resetOnly) == "undefined") {
		var resetOnly = false;
	}

	this.options = (this.options & 0xFFDF) + (resetOnly ? 32 : 0);
}



/**
 * Set parameter for public key authentication with n-of-m scheme, namely the values for n and m
 *
 * @param {Number} requiredPublicKeysForAuthentication number of key that must be authenticated for access
 * @param {Number} numberOfPublicKeys to register
 */
SmartCardHSMInitializer.prototype.setPublicKeyAuthenticationParameter = function(requiredPublicKeysForAuthentication, numberOfPublicKeys) {
	if ((numberOfPublicKeys < 1) || (numberOfPublicKeys > 90)) {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 1, "numberOfPublicKeys must be between 1 and 90");
	}
	if ((requiredPublicKeysForAuthentication < 1) || (requiredPublicKeysForAuthentication > numberOfPublicKeys)) {
		throw new GPError("SmartCardHSMInitializer", GPError.INVALID_DATA, 2, "requiredPublicKeysForAuthentication must be between 1 and " + numberOfPublicKeys);
	}
	this.numberOfPublicKeys = numberOfPublicKeys;
	this.requiredPublicKeysForAuthentication = requiredPublicKeysForAuthentication;
	this.useDefaultUserPIN = false;
}



/**
 * Select the biometric matching server for a one of the biometric templates
 *
 * @param {Number} slot either 0 or 1 for first or second template
 * @param {ByteString} aid the application identifier of the on-card biometric server
 * @param {Number} param one byte parameter passed to the server during initialization
 */
SmartCardHSMInitializer.prototype.setBioTemplate = function(slot, aid, param) {
	assert(typeof(slot) == "number", "slot must be a number");
	assert(slot >= 0 && slot <= 1, "slot must be either 0 or 1");
	assert(aid instanceof ByteString, "aid must be a ByteString");
	assert(typeof(param) == "number", "param must be a number");
	assert(param >= 0 && param <= 255, "param must be between 0 and 255");

	this.bioslot[slot] = { aid: aid, param: param };
	this.useDefaultUserPIN = false;
}



/**
 * Set the label to be written to a minimal CIAInfo in EF 2F03
 *
 * @param {String} label the label
 */
SmartCardHSMInitializer.prototype.setLabel = function(label) {
	this.label = label;
}



/**
 * Set the provisioning URL to be written to fixed parameter in CB00.
 *
 * @param {String} provisioningURL the URL at which this SE will be provisioned
 */
SmartCardHSMInitializer.prototype.setProvisioningURL = function(provisioningURL) {
	this.provisioningURL = provisioningURL;
}



/**
 * Set the key check value of the token management key and the optional salt
 * used for SO-PIN derivation
 *
 * @param {ByteString} kcv the key check value of the token management key
 * @param {ByteString} salt the salt used to derive the SO-PIN
 */
SmartCardHSMInitializer.prototype.setTokenManagementKey = function(kcv, salt) {
	this.tokenManagementKeyKCV = kcv;
	this.tokenManagementKeySalt = salt;
}



/**
 * Perform Initialization
 */
SmartCardHSMInitializer.prototype.initialize = function() {
	var s = new ASN1(0x30,	new ASN1(0x80, ByteString.valueOf(this.options, 2)));

	if (this.userPINSet || this.useDefaultUserPIN) {
		s.add(new ASN1(0x81, this.userPIN));
	}

	s.add(new ASN1(0x82, this.initializationCode));

	if (this.userPINSet || this.useDefaultUserPIN) {
		s.add(new ASN1(0x91, ByteString.valueOf(this.retryCounterInitial)));
	}

	if (this.keyshares != -1) {
		s.add(new ASN1(0x92, ByteString.valueOf(this.keyshares)));
	}

	if (this.keyDomains != -1) {
		s.add(new ASN1(0x97, ByteString.valueOf(this.keyDomains)));
	}

	if (this.numberOfPublicKeys > 0) {
		s.add(new ASN1(0x93, ByteString.valueOf(this.numberOfPublicKeys).concat(ByteString.valueOf(this.requiredPublicKeysForAuthentication))));
	}

	if (this.bioslot[0]) {
		var o = this.bioslot[0];
		s.add(new ASN1(0x95, ByteString.valueOf(o.param).concat(o.aid)));
	}

	if (this.bioslot[1]) {
		var o = this.bioslot[1];
		s.add(new ASN1(0x96, ByteString.valueOf(o.param).concat(o.aid)));
	}

	this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x50, 0x00, 0x00, s.value, [0x9000, 0x6A84]);

	if (this.card.SW == 0x6A84) {
		// Due to the nature of the JCRE, a first call to initialize may run out of memory,
		// as the garbage collector for the removed objects is only run during the next
		// APDU invocation.
		this.card.sendSecMsgApdu(Card.ALL, 0x80, 0x50, 0x00, 0x00, s.value, [0x9000]);
	}

	if (this.label) {
		var a = new ASN1(0x30,
				new ASN1(0x54, new ByteString("0000", HEX)),
				new ASN1(0x53,
					new ASN1(0x30,
						new ASN1(0x02, new ByteString("00", HEX)),
						new ASN1(0x80, new ByteString(this.label, UTF8)),
						new ASN1(0x03, new ByteString("0500", HEX)))
				)
			);

		var p1 = SmartCardHSM.EF_TokenInfo.byteAt(0);
		var p2 = SmartCardHSM.EF_TokenInfo.byteAt(1);
		this.card.sendSecMsgApdu(Card.ALL, 0x00, 0xD7, p1, p2, a.value, [0x9000]);
	}

	if (this.provisioningURL || this.tokenManagementKeyKCV || this.tokenManagementKeySalt) {
		var l = new ASN1(ASN1.SEQUENCE);
		if (this.provisioningURL) {
			l.add(new ASN1(0x80, new ByteString(this.provisioningURL, UTF8)));
		}
		if (this.tokenManagementKeyKCV) {
			l.add(new ASN1(0x81, this.tokenManagementKeyKCV));
		}
		if (this.tokenManagementKeySalt) {
			l.add(new ASN1(0x82, this.tokenManagementKeySalt));
		}

		var a = new ASN1(0x30,
				new ASN1(0x54, new ByteString("0000", HEX)),
				new ASN1(0x53, l)
			);

		var p1 = SmartCardHSM.EF_StaticTokenInfo.byteAt(0);
		var p2 = SmartCardHSM.EF_StaticTokenInfo.byteAt(1);
		this.card.sendSecMsgApdu(Card.ALL, 0x00, 0xD7, p1, p2, a.value, [0x9000]);
	}
}



/**
 * Create a key specification generator instance
 *
 * @class Class implementing an encoder for the C-Data required in GENERATE ASYMMETRIC KEY PAIR
 * @param {Number} keytype must be either Crypto.RSA, Crypto.EC or Crypto.AES
 * @param {Number/Key} keysizeOrDP must be 1024, 1536, 2048, 3072 or 4096 for RSA, 128, 192 or 256 for AES and key object with Key.ECC_CURVE_OID set for EC
 */
function SmartCardHSMKeySpecGenerator(keytype, keysizeOrDP) {
	this.keytype = keytype;

	switch(keytype) {
		case Crypto.RSA:
			if (typeof(keysizeOrDP) != "number") {
				throw new GPError("SmartCardHSMKeySpecGenerator", GPError.INVALID_DATA, 3, "keysizeIdDP must be of a number for RSA keys");
			}
			this.keysize = keysizeOrDP;
			this.defaultAlgo = new ByteString("id-TA-RSA-v1-5-SHA-256", OID);
			break;
		case Crypto.EC:
			if ((typeof(keysizeOrDP) != "object") || !(keysizeOrDP instanceof Key)) {
				throw new GPError("SmartCardHSMKeySpecGenerator", GPError.INVALID_DATA, 3, "keysizeIdDP must be a Key instance");
			}
			this.domainParameter = keysizeOrDP;
			this.defaultAlgo = new ByteString("id-TA-ECDSA-SHA-256", OID);
			break;
		case Crypto.AES:
			if (typeof(keysizeOrDP) != "number") {
				throw new GPError("SmartCardHSMKeySpecGenerator", GPError.INVALID_DATA, 3, "keysizeIdDP must be of a number for AES keys");
			}
			this.keysize = keysizeOrDP;
			break;
		default:
			throw new GPError("SmartCardHSMKeySpecGenerator", GPError.INVALID_DATA, 3, "keytype must be Crypto.RSA or Crypto.EC");
	}
	this.CHR = new PublicKeyReference("UTDUMMY00001");
	this.innerCAR = new PublicKeyReference("UTDUMMY00001");
}

exports.SmartCardHSMKeySpecGenerator = SmartCardHSMKeySpecGenerator;



/**
 * Set key use counter for key
 *
 * @param {keyUseCounter} keyUseCounter in the range 1 to 2^64 - 2
 */
SmartCardHSMKeySpecGenerator.prototype.setKeyUseCounter = function(keyUseCounter) {
	if ((keyUseCounter < 0) || (keyUseCounter >= 0xFFFFFFFF)) {
		throw new GPError("SmartCardHSMKeySpecGenerator", GPError.INVALID_DATA, 1, "keyUseCounter must be between 0 and 0xFFFFFFFF");
	}
	this.keyUseCounter = keyUseCounter;
}



/**
 * Set key domain
 *
 * @param {Number} keyDomain the key domain to which the key shall be added
 */
SmartCardHSMKeySpecGenerator.prototype.setKeyDomain = function(keyDomain) {
	this.keyDomain = keyDomain;
}



/**
 * Set wrapping key
 *
 * @param {Number} wrappingKey the key to used for wrapping a newly generated symmetric key
 */
SmartCardHSMKeySpecGenerator.prototype.setWrappingKey = function(wrappingKey) {
	this.wrappingKey = wrappingKey;
}



/**
 * Set algorithm list
 *
 * @param {ByteString} algorithms the list of algorithms allowed for this key
 */
SmartCardHSMKeySpecGenerator.prototype.setAlgorithms = function(algorithms) {
	this.algorithms = algorithms;
}



/**
 * Set certificate holder reference for key
 *
 * @param {PublicKeyReference} CHR certificate holder reference
 */
SmartCardHSMKeySpecGenerator.prototype.setCHR = function(CHR) {
	this.CHR = CHR;
}



/**
 * Set certificate holder reference of CA this request shall be sent to
 *
 * @param {PublicKeyReference} CAR certificate holder reference
 */
SmartCardHSMKeySpecGenerator.prototype.setInnerCAR = function(CAR) {
	this.innerCAR = CAR;
}



/**
 * Set holder reference of the key signing this request
 *
 * @param {PublicKeyReference} CAR certificate holder reference
 */
SmartCardHSMKeySpecGenerator.prototype.setOuterCAR = function(CAR) {
	this.outerCAR = CAR;
}



/**
 * @private
 */
SmartCardHSMKeySpecGenerator.prototype.encodeRSAKeySpec = function() {
	var p = new ASN1("Public Key", 0x7F49,
			new ASN1("Object Identifier", 0x06, this.defaultAlgo),
			new ASN1("Public Key Exponent", 0x82, ByteString.valueOf(65537)),
			new ASN1("Key Size", 0x02, ByteString.valueOf(this.keysize))
		);
	return p;
}



/**
 * @private
 */
SmartCardHSMKeySpecGenerator.prototype.encodeECKeySpec = function() {
	// Encode G
	var bb = new ByteBuffer();
	// uncompressed encoding
	bb.append(new ByteString("04", HEX));
	bb.append(this.domainParameter.getComponent(Key.ECC_GX));
	bb.append(this.domainParameter.getComponent(Key.ECC_GY));
	var G = bb.toByteString();

	var p = new ASN1("Public Key", 0x7F49,
			new ASN1("Object Identifier", 0x06, this.defaultAlgo),
			new ASN1("Prime Modulus", 0x81, this.domainParameter.getComponent(Key.ECC_P)),
			new ASN1("First coefficient a", 0x82, this.domainParameter.getComponent(Key.ECC_A)),
			new ASN1("Second coefficient b", 0x83, this.domainParameter.getComponent(Key.ECC_B)),
			new ASN1("Base Point G", 0x84, G),
			new ASN1("Order of the base point", 0x85, this.domainParameter.getComponent(Key.ECC_N)),
			new ASN1("Cofactor f", 0x87, SmartCardHSM.stripLeadingZeros(this.domainParameter.getComponent(Key.ECC_H)))
		);
	return p;
}



/**
 * @private
 */
SmartCardHSMKeySpecGenerator.prototype.encodeKeySpec = function() {
	if (this.keytype == Crypto.RSA) {
		return this.encodeRSAKeySpec();
	} else {
		return this.encodeECKeySpec();
	}
}



/**
 * Return the encoded key specification
 *
 * @type ByteString
 * @return the encoded C-Data for GENERATE ASYMMETRIC KEY PAIR
 */
SmartCardHSMKeySpecGenerator.prototype.encode = function() {
	var t = new ASN1(0x30);

	if (this.keytype != Crypto.AES) {
		t.add(new ASN1("CPI", 0x5F29, new ByteString("00", HEX)));

		if ((typeof(this.innerCAR) != "undefined") && (this.innerCAR)) {
			t.add(new ASN1("CAR", 0x42, this.innerCAR.getBytes()));
		}

		t.add(this.encodeKeySpec());
		t.add(new ASN1("CHR", 0x5F20, this.CHR.getBytes()));

		if (typeof(this.outerCAR) != "undefined") {
			t.add(new ASN1("OuterCAR", 0x45, this.outerCAR.getBytes()));
		}
	}

	if (typeof(this.keyUseCounter) != "undefined") {
		t.add(new ASN1("Key use counter", 0x90, ByteString.valueOf(this.keyUseCounter, 4)));
	}

	if (typeof(this.algorithms) != "undefined") {
		t.add(new ASN1("Algorithms", 0x91, this.algorithms));
	}

	if (typeof(this.keyDomain) != "undefined") {
		t.add(new ASN1("KeyDomain", 0x92, ByteString.valueOf(this.keyDomain)));
	}

	if (typeof(this.wrappingKey) != "undefined") {
		t.add(new ASN1("Wrapping Key", 0x93, ByteString.valueOf(this.wrappingKey)));
	}

	return t.value;
}



/**
 * Create a key specification generator instance for AES keys
 *
 * @class Class implementing an encoder for the C-Data required in Generate Symmetric Key
 * @param {ByteString} allowedAlgorithms the list of allowed algorithm identifier
 */
function SmartCardHSMSymmetricKeySpecGenerator(allowedAlgorithms) {
	this.algorithms = allowedAlgorithms;
}

exports.SmartCardHSMSymmetricKeySpecGenerator = SmartCardHSMSymmetricKeySpecGenerator;



/**
 * Set key domain
 *
 * @param {Number} keyDomain the key domain to which the key shall be added
 */
SmartCardHSMSymmetricKeySpecGenerator.prototype.setKeyDomain = function(keyDomain) {
	this.keyDomain = keyDomain;
}



/**
 * Return the encoded AES key specification
 *
 * @type ByteString
 * @return the encoded C-Data for Generate Symmetric Key
 */
SmartCardHSMSymmetricKeySpecGenerator.prototype.encode = function() {
	var t = new ASN1(0x30);

	t.add(new ASN1("Algorithms", 0x91, this.algorithms));

	if (typeof(this.keyUseCounter) != "undefined") {
		t.add(new ASN1("Key use counter", 0x90, ByteString.valueOf(this.keyUseCounter, 4)));
	}

	if (typeof(this.keyDomain) != "undefined") {
		t.add(new ASN1("Key Domain", 0x92, ByteString.valueOf(this.keyDomain)));
	}

	if (typeof(this.wrappingKey) != "undefined") {
		t.add(new ASN1("Wrapping Key", 0x93, this.wrappingKey));
	}

	return t.value;
}



SmartCardHSM.test = function() {
	var crypto = new Crypto();
	var card = new Card(_scsh3.reader);
	var sc = new SmartCardHSM(card);

	var sci = new SmartCardHSMInitializer(card);
	sci.initialize();

	var pubKey = sc.validateCertificateChain(crypto);
	sc.openSecureChannel(crypto, pubKey);

	sc.verifyUserPIN(sci.userPIN);

	var kg = new SmartCardHSMKeySpecGenerator(Crypto.RSA, 1024);
	sc.generateAsymmetricKeyPair(1, 0, kg.encode());

	var dp = new Key();
	dp.setComponent(Key.ECC_CURVE_OID, new ByteString("brainpoolP256r1", OID));

	var kg = new SmartCardHSMKeySpecGenerator(Crypto.EC, dp);
	sc.generateAsymmetricKeyPair(2, 0, kg.encode());

	var list = sc.enumerateKeys();
	GPSystem.trace("Keys on device: " + list);

	var crypto = sc.getCrypto();
	var message = new ByteString("Hello World", ASCII);

	var key = sc.getKey(1);
	var signature = crypto.sign(key, Crypto.RSA_SHA256, message);
	GPSystem.trace("Signature: " + signature);

	var key = sc.getKey(2);
	var signature = crypto.sign(key, Crypto.ECDSA, message);
	GPSystem.trace("Signature: " + signature);
}
