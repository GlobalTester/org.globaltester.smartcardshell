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
 * @fileoverview Support for card verifiable certificates and certificate requests according to EAC 1.1/2.0
 */


// Imports
var PublicKeyReference = require('scsh/eac/PublicKeyReference').PublicKeyReference;



/**
 * Create a CVC object from a DER encoded ByteString.
 *
 * @class Class implementing a decoder for card verifiable certificates or requests according to
 *        Extended Access Control (EAC) as defined in BSI TR-03110 1.11 and 2.02.
 * @constructor
 * @param {ByteString} param the DER encoded certificate
 * @return
 */
function CVC() {
	if (arguments.length > 0) {
		var arg = arguments[0];
		if (arg instanceof ASN1) {
			this.asn = arg;
			this.bin = this.asn.getBytes();
		} else if (arg instanceof ByteString) {
			this.bin = arg;
			this.asn = new ASN1(this.bin);
		} else {
			throw new GPError("CVC", GPError.INVALID_DATA, 0, "Argument must be of type ByteString or ASN1");
		}
		if (this.asn.tag == CVC.TAG_AT) {
			this.body = this.asn.get(0).get(0);
		} else if (this.asn.tag == CVC.TAG_CVC) {
			this.body = this.asn.get(0);
		} else {
			throw new GPError("CVC", GPError.INVALID_DATA, 0, "Argument is neither a CVC or CVC request");
		}
	}
}

exports.CVC = CVC;

CVC.crypto = new Crypto();


/** Authentication Template */
CVC.TAG_AT = 0x67;
/** CV Certificate */
CVC.TAG_CVC = 0x7F21;
/** Certificate Body */
CVC.TAG_BODY = 0x7F4E;
/** Certificate Profile Identifier */
CVC.TAG_CPI = 0x5F29;
/** Certification Authority Reference */
CVC.TAG_CAR = 0x42;
/** Public Key */
CVC.TAG_PUK = 0x7F49;
/** Prime Modulus */
CVC.TAG_ECC_P = 0x81;
/** First coefficient a */
CVC.TAG_ECC_A = 0x82;
/** Second coefficient b */
CVC.TAG_ECC_B = 0x83;
/** Base Point G */
CVC.TAG_ECC_G = 0x84;
/** Order of the base point */
CVC.TAG_ECC_N = 0x85;
/** Public Point y */
CVC.TAG_ECC_Q = 0x86;
/** Cofactor f */
CVC.TAG_ECC_H = 0x87;
/** Certificate Holder Reference */
CVC.TAG_CHR = 0x5F20;
/** Certificate Holder Authorisation Template */
CVC.TAG_CHAT = 0x7F4C;
/** Relative Authorization */
CVC.TAG_AUT = 0x53;
/** Certificate Extension */
CVC.TAG_EXTN = 0x65;
/** Certificate Effective Date */
CVC.TAG_CED = 0x5F25;
/** Certificate Expiration Date */
CVC.TAG_CXD = 0x5F24;
/** Signature */
CVC.TAG_SIG = 0x5F37;


/** Table of tag names */
CVC.OBJECTNAMES = []
CVC.OBJECTNAMES[CVC.TAG_AT] = "Authentication Template";
CVC.OBJECTNAMES[CVC.TAG_CVC] = "CV Certificate";
CVC.OBJECTNAMES[CVC.TAG_BODY] = "Certificate Body";
CVC.OBJECTNAMES[CVC.TAG_CPI] = "Certificate Profile Indicator";
CVC.OBJECTNAMES[CVC.TAG_CAR] = "Certification Authority Reference";
CVC.OBJECTNAMES[CVC.TAG_PUK] = "Public Key";
CVC.OBJECTNAMES[CVC.TAG_ECC_P] = "Prime/Modulus";
CVC.OBJECTNAMES[CVC.TAG_ECC_A] = "First coefficient a/Exponent";
CVC.OBJECTNAMES[CVC.TAG_ECC_B] = "Second coefficient b";
CVC.OBJECTNAMES[CVC.TAG_ECC_G] = "Base Point G";
CVC.OBJECTNAMES[CVC.TAG_ECC_N] = "Order of the base point";
CVC.OBJECTNAMES[CVC.TAG_ECC_Q] = "Public Point y";
CVC.OBJECTNAMES[CVC.TAG_ECC_H] = "Cofactor f";
CVC.OBJECTNAMES[CVC.TAG_CHR] = "Certificate Holder Reference";
CVC.OBJECTNAMES[CVC.TAG_CHAT] = "Certificate Holder Authentication Template";
CVC.OBJECTNAMES[CVC.TAG_AUT] = "Relative Authorization";
CVC.OBJECTNAMES[CVC.TAG_EXTN] = "Extension";
CVC.OBJECTNAMES[CVC.TAG_CED] = "Certificate Effective Date";
CVC.OBJECTNAMES[CVC.TAG_CXD] = "Certificate Expiration Date";
CVC.OBJECTNAMES[CVC.TAG_SIG] = "Signature";

CVC.PUK_SYNTAX = [
	{ tag: 0x06, minlen: 2, maxlen: 20 },
	{ tag: CVC.TAG_ECC_P, minlen: 20, maxlen: 512, optional: true },
	{ tag: CVC.TAG_ECC_A, minlen: 1, maxlen: 512, optional: true },
	{ tag: CVC.TAG_ECC_B, minlen: 20, maxlen: 66, optional: true },
	{ tag: CVC.TAG_ECC_G, minlen: 41, maxlen: 133, optional: true },
	{ tag: CVC.TAG_ECC_N, minlen: 20, maxlen: 66, optional: true },
	{ tag: CVC.TAG_ECC_Q, minlen: 41, maxlen: 133, optional: true },
	{ tag: CVC.TAG_ECC_H, minlen: 1, maxlen: 1, optional: true }
];

CVC.REQ_BODY_SYNTAX = [
	{ tag: CVC.TAG_CPI, minlen: 1, maxlen: 1 },
	{ tag: CVC.TAG_CAR, minlen: 8, maxlen: 16, optional: true },
	{ tag: CVC.TAG_PUK, content: CVC.PUK_SYNTAX },
	{ tag: CVC.TAG_CHR, minlen: 8, maxlen: 16 },
	{ tag: CVC.TAG_EXTN, optional: true }
];

CVC.REQ_SYNTAX = [
	{ tag: CVC.TAG_BODY, content: CVC.REQ_BODY_SYNTAX },
	{ tag: CVC.TAG_SIG, minlen: 40, maxlen: 550 }
];

CVC.ATREQ_SYNTAX = [
	{ tag: CVC.TAG_CVC, content: CVC.REQ_SYNTAX },
	{ tag: CVC.TAG_CAR, minlen: 8, maxlen: 16 },
	{ tag: CVC.TAG_SIG, minlen: 40, maxlen: 550 }
];

CVC.CHAT_SYNTAX = [
	{ tag: 0x06, minlen: 2, maxlen: 20 },
	{ tag: CVC.TAG_AUT, minlen: 1, maxlen: 5 }
];

CVC.CERT_BODY_SYNTAX = [
	{ tag: CVC.TAG_CPI, minlen: 1, maxlen: 1 },
	{ tag: CVC.TAG_CAR, minlen: 8, maxlen: 16 },
	{ tag: CVC.TAG_PUK, content: CVC.PUK_SYNTAX },
	{ tag: CVC.TAG_CHR, minlen: 8, maxlen: 16 },
	{ tag: CVC.TAG_CHAT, content: CVC.CHAT_SYNTAX },
	{ tag: CVC.TAG_CED, minlen: 6, maxlen: 6 },
	{ tag: CVC.TAG_CXD, minlen: 6, maxlen: 6 },
	{ tag: CVC.TAG_EXTN, optional: true }
];

CVC.CERT_SYNTAX = [
	{ tag: CVC.TAG_BODY, content: CVC.CERT_BODY_SYNTAX },
	{ tag: CVC.TAG_SIG, minlen: 24, maxlen: 550 }
];



/** Table of rights description for id-IS */
CVC.ISRIGHTS = [
	"Read access to ePassport application: DG 3 (Fingerprint)",
	"Read access to ePassport application: DG 4 (Iris)",
	"RFU (Bit 3)",
	"RFU (Bit 4)",
	"RFU (Bit 5)",
	"Read access to eID application"
];
CVC.idIS = new ByteString("id-IS", OID);


/** Table of rights description for id-AT */
CVC.ATRIGHTS = [
	"Age Verification",
	"Community ID Verification",
	"Restricted Identification",
	"Privileged Terminal",
	"CAN allowed",
	"PIN Management",
	"Install Certificate",
	"Install Qualified Certificate",

	"Read Access DG 1 (Document Type)",
	"Read Access DG 2 (Issuing State)",
	"Read Access DG 3 (Date of Expiration)",
	"Read Access DG 4 (Given Name)",
	"Read Access DG 5 (Surname)",
	"Read Access DG 6 (Pseudonym)",
	"Read Access DG 7 (Academic Grade)",
	"Read Access DG 8 (Date of Birth)",

	"Read Access DG 9 (Place of Birth)",
	"Read Access DG 10",
	"Read Access DG 11",
	"Read Access DG 12",
	"Read Access DG 13",
	"Read Access DG 14",
	"Read Access DG 15",
	"Read Access DG 16",

	"Read Access DG 17 (Place of Residence)",
	"Read Access DG 18 (Community ID)",
	"Read Access DG 19 (Conditions I-eAT)",
	"Read Access DG 20 (Conditions II-eAT)",
	"Read Access DG 21",
	"RFU (Bit 29)",
	"RFU (Bit 30)",
	"RFU (Bit 31)",

	"RFU (Bit 32)",
	"Write Access DG 21",
	"Write Access DG 20 (Conditions II-eAT)",
	"Write Access DG 19 (Conditions I-eAT)",
	"Write Access DG 18 (Community ID)",
	"Write Access DG 17 (Place of Residence)"
];
CVC.idAT = new ByteString("id-AT", OID);



/** Table of rights description for id-ST */
CVC.STRIGHTS = [
	"Generate electronic signature",
	"Generate qualified electronic signature",
	"RFU (Bit 2)",
	"RFU (Bit 3)",
	"RFU (Bit 4)",
	"RFU (Bit 5)"
];
CVC.idST = new ByteString("id-ST", OID);

CVC.idSC_HSM = new ByteString("2B0601040181C31F030101", HEX);



/** TA constants */
CVC.id_TA_ECDSA = new ByteString("id-TA-ECDSA", OID);
CVC.id_TA_ECDSA_SHA_1 = new ByteString("id-TA-ECDSA-SHA-1", OID);
CVC.id_TA_ECDSA_SHA_224 = new ByteString("id-TA-ECDSA-SHA-224", OID);
CVC.id_TA_ECDSA_SHA_256 = new ByteString("id-TA-ECDSA-SHA-256", OID);
CVC.id_TA_ECDSA_SHA_384 = new ByteString("id-TA-ECDSA-SHA-384", OID);
CVC.id_TA_ECDSA_SHA_512 = new ByteString("id-TA-ECDSA-SHA-512", OID);
CVC.id_TA_RSA_v1_5_SHA_1 = new ByteString("id-TA-RSA-v1-5-SHA-1", OID);
CVC.id_TA_RSA_v1_5_SHA_256 = new ByteString("id-TA-RSA-v1-5-SHA-256", OID);
CVC.id_TA_RSA_v1_5_SHA_512 = new ByteString("id-TA-RSA-v1-5-SHA-512", OID);
CVC.id_TA_RSA_PSS_SHA_1 = new ByteString("id-TA-RSA-PSS-SHA-1", OID);
CVC.id_TA_RSA_PSS_SHA_256 = new ByteString("id-TA-RSA-PSS-SHA-256", OID);
CVC.id_TA_RSA_PSS_SHA_512 = new ByteString("id-TA-RSA-PSS-SHA-512", OID);

CVC.id_ECPUBLICKEY = new ByteString("id-ecPublicKey", OID);
CVC.id_ANSIX9 = new ByteString("iso(1) member-body(2) us(840) ansi-X9-62(10045) curves(3) prime(1)", OID);
CVC.id_CERTICOM = new ByteString("iso(1) identified-organization(3) certicom(132) curve(0)", OID);
CVC.id_BRAINPOOL = new ByteString("ellipticCurve", OID);



/**
 * Return signature mechanism for object identifier
 *
 * @param {ByteString} oid the object identifer from the public key object
 * @returns the signature mechanism as Crypto. constant or -1 if not defined
 * @type Number
 */
CVC.getSignatureMech = function(oid, keysize) {
	if (oid.equals(CVC.id_TA_ECDSA_SHA_1))
		return Crypto.ECDSA_SHA1;
	if (oid.equals(CVC.id_TA_ECDSA_SHA_224))
		return Crypto.ECDSA_SHA224;
	if (oid.equals(CVC.id_TA_ECDSA_SHA_256))
		return Crypto.ECDSA_SHA256;
	if (oid.equals(CVC.id_TA_ECDSA_SHA_384))
		return Crypto.ECDSA_SHA384;
	if (oid.equals(CVC.id_TA_ECDSA_SHA_512))
		return Crypto.ECDSA_SHA512;
	if (oid.equals(CVC.id_TA_RSA_v1_5_SHA_1))
		return Crypto.RSA_SHA1;
	if (oid.equals(CVC.id_TA_RSA_v1_5_SHA_256))
		return Crypto.RSA_SHA256;
	if (oid.equals(CVC.id_TA_RSA_v1_5_SHA_512))
		return Crypto.RSA_SHA512;
	if (oid.equals(CVC.id_TA_RSA_PSS_SHA_1))
		return Crypto.RSA_PSS_SHA1;
	if (oid.equals(CVC.id_TA_RSA_PSS_SHA_256))
		return Crypto.RSA_PSS_SHA256;
	if (oid.equals(CVC.id_TA_RSA_PSS_SHA_512))
		return Crypto.RSA_PSS_SHA512;
	if (CVC.isCurveOID(oid)) {
		assert(typeof(keysize) == "number", "Argument keysize must be number");
		if (keysize >= 512) {
			return Crypto.ECDSA_SHA512;
		} else if (keysize >= 384) {
			return Crypto.ECDSA_SHA384;
		} else if (keysize >= 256) {
			return Crypto.ECDSA_SHA256;
		} else if (keysize >= 224) {
			return Crypto.ECDSA_SHA224;
		}
	}

	return -1;
}



/**
 * Return hash mechanism for object identifier
 *
 * @param {ByteString} oid the object identifer from the public key object
 * @returns the hash mechanism as Crypto. constant or -1 if not defined
 * @type Number
 */
CVC.getHashMech = function(oid) {
	if (oid.equals(CVC.id_TA_ECDSA_SHA_1))
		return Crypto.SHA_1;
	if (oid.equals(CVC.id_TA_ECDSA_SHA_224))
		return Crypto.SHA_224;
	if (oid.equals(CVC.id_TA_ECDSA_SHA_256))
		return Crypto.SHA_256;
	if (oid.equals(CVC.id_TA_ECDSA_SHA_384))
		return Crypto.SHA_384;
	if (oid.equals(CVC.id_TA_ECDSA_SHA_512))
		return Crypto.SHA_512;
	if (oid.equals(CVC.id_TA_RSA_v1_5_SHA_1))
		return Crypto.SHA_1;
	if (oid.equals(CVC.id_TA_RSA_v1_5_SHA_256))
		return Crypto.SHA_256;
	if (oid.equals(CVC.id_TA_RSA_v1_5_SHA_512))
		return Crypto.SHA_512;
	if (oid.equals(CVC.id_TA_RSA_PSS_SHA_1))
		return Crypto.SHA_1;
	if (oid.equals(CVC.id_TA_RSA_PSS_SHA_256))
		return Crypto.SHA_256;
	if (oid.equals(CVC.id_TA_RSA_PSS_SHA_512))
		return Crypto.SHA_512;
	return -1;
}



/**
 * Return true of the object identifier denotes a curve
 *
 * @type boolean
 * @return true, if ECDSA based OID
 */
CVC.isCurveOID = function(oid) {
	if (oid.startsWith(CVC.id_BRAINPOOL) == CVC.id_BRAINPOOL.length) {
		return true;
	}
	if (oid.startsWith(CVC.id_ANSIX9) == CVC.id_ANSIX9.length) {
		return true;
	}
	if (oid.startsWith(CVC.id_CERTICOM) == CVC.id_CERTICOM.length) {
		return true;
	}
	return false;
}



/**
 * Return true of the object identifier starts with id-TA-ECDSA
 *
 * @type boolean
 * @return true, if ECDSA based OID
 */
CVC.isECDSA = function(oid) {
	if (oid.startsWith(CVC.id_TA_ECDSA) == CVC.id_TA_ECDSA.length) {
		return true;
	}
	if (oid.equals(CVC.id_ECPUBLICKEY)) {
		return true;
	}
	if (CVC.isCurveOID(oid)) {
		return true;
	}
	return false;
}



/**
 * Wrap an ECDSA signature in the format r || s into a TLV encoding as defined by RFC 3279
 *
 * @param signature ByteString containing the concatenation of r and s as unsigned integer values
 * @returns ASN.1 SEQUENCE objects containing two signed integer r and s
 */
CVC.wrapSignature = function(signature) {
	var len = signature.length / 2;

	// r and s are unsigned big integer. We might need to pad a zero for ASN.1 INTEGER which is signed
	var r = signature.bytes(0, len);
	while ((r.length > 1) && (r.byteAt(0) == 0)) {
		r = r.bytes(1);
	}
	if (r.byteAt(0) >= 0x80) {
		r = ByteString.valueOf(0, 1).concat(r);
	}

	var s = signature.bytes(len, len);
	while ((s.length > 1) && (s.byteAt(0) == 0)) {
		s = s.bytes(1);
	}
	if (s.byteAt(0) >= 0x80) {
		s = ByteString.valueOf(0, 1).concat(s);
	}

	var t = new ASN1(ASN1.SEQUENCE);
	t.add(new ASN1(ASN1.INTEGER, r));
	t.add(new ASN1(ASN1.INTEGER, s));

	return t.getBytes();
}



/**
 * Integer to octet string conversion
 */
CVC.I2O = function(value, length) {
	if (value.length > length) {
		value = value.right(length);
	}
	while (value.length < length) {
		value = CVC.PAD.left((length - value.length - 1 & 15) + 1).concat(value);
	}
	return value;
}
CVC.PAD = new ByteString("00000000000000000000000000000000", HEX);



/**
 * Unwrap a ECDSA signature from the TLV encoding according to RFC3279 into the concatenation
 * of the unsigned integer r and s
 *
 * @param signature TLV encoded signature
 * @returns concatenation of r and s
 */
CVC.unwrapSignature = function(signature, keylen) {
	var t = new ASN1(signature);
	if (typeof(keylen) != "undefined") {
		var r = CVC.I2O(t.get(0).value, keylen);
		var s = CVC.I2O(t.get(1).value, keylen);
	} else {
		var r = t.get(0).value;
		if (r.byteAt(0) == 00)
			r = r.bytes(1);

		var s = t.get(1).value;
		if (s.byteAt(0) == 00)
			s = s.bytes(1);
	}

	return r.concat(s);
}



/**
 * Rewrap an ECDSA signature that contains redundant leading zeros in integer.
 *
 * @param signature the signature
 * @type ByteString
 * @param the fixed signature
 */
CVC.rewrapSignature = function(signature) {
	var a = new ASN1(signature);
	var r = a.get(0).value;
	while ((r.byteAt(0) == 0) && (r.byteAt(1) < 0x80)) {
		r = r.bytes(1);
	}

	var s = a.get(1).value;
	while ((s.byteAt(0) == 0) && (s.byteAt(1) < 0x80)) {
		s = s.bytes(1);
	}
	return (new ASN1(0x30, new ASN1(0x02, r), new ASN1(0x02, s))).getBytes();
}



/**
 * Check a ASN sequence against a structure description
 *
 * @private
 * @param {Object} s the structure description
 * @param {ASN1} asn the asn sequence
 * @type String
 * @return null if valid or the validation error message
 */
CVC.checkStructure = function(s, asn) {
	var j = 0;
	for (var i = 0; i < s.length; i++) {
		var d = s[i];

//		print("Checking tag " + d.tag.toString(HEX));

		if (j < asn.elements) {
			var a = asn.get(j);

			if (a.tag == d.tag) {
				if ((typeof(d.minlen) != "undefined") && (a.value.length < d.minlen)) {
					return "Length (" + a.value.length + ") of " + CVC.OBJECTNAMES[d.tag] + "(" + d.tag.toString(HEX) + ") less than " + d.minlen;
				}
				if ((typeof(d.maxlen) != "undefined") && (a.value.length > d.maxlen)) {
					return "Length (" + a.value.length + ") of " + CVC.OBJECTNAMES[d.tag] + "(" + d.tag.toString(HEX) + ") more than " + d.maxlen;
				}
				if ((typeof(d.content) != "undefined")) {
					var r = CVC.checkStructure(d.content, a);
					if (r) {
						return r;
					}
				}
				j++;
			} else {
				if (!d.optional) {
					return "Expecting " + CVC.OBJECTNAMES[d.tag] + "(" + d.tag.toString(HEX) + ") but found tag " + a.tag.toString(HEX);
				}
			}
		} else {
			if (!d.optional) {
				return "Expecting " + CVC.OBJECTNAMES[d.tag] + "(" + d.tag.toString(HEX) + ") but sequence is exhaused";
			}
		}
	}
	return null;
}



/**
 * Validate ASN1 semantic for card verifiable certificate or certificate request
 *
 * @type String
 * @return null if no error, or error message
 */
CVC.prototype.validate = function() {
	var r = null;
	if (this.asn.tag == CVC.TAG_AT) {
		r = CVC.checkStructure(CVC.ATREQ_SYNTAX, this.asn);
	} else {
		if (this.body.find(CVC.TAG_CED)) {
			r = CVC.checkStructure(CVC.CERT_SYNTAX, this.asn);
		} else {
			r = CVC.checkStructure(CVC.REQ_SYNTAX, this.asn);
		}
	}
	return r;
}



/**
 * Return true of the certificate contains domain parameter
 *
 * @type boolean
 * @return true, if certificate contains domain parameter
 */
CVC.prototype.containsDomainParameter = function() {
	var pdo = this.body.find(CVC.TAG_PUK);
	if (pdo == null) {
		return false;
	}

	var d = pdo.find(0x84);		// Generator
	return (d != null);
}



/**
 * Returns the certificate profile indicator (CPI)
 *
 * @return the CPI or null
 * @type Number
 */
CVC.prototype.getCPI = function() {
	var cpido = this.body.find(CVC.TAG_CPI);

	if (!cpido) {
		return null;
	}

	return cpido.value.toUnsigned();
}



/**
 * Returns the certification authority reference (CAR).
 *
 * @return the CAR or null
 * @type PublicKeyReference
 */
CVC.prototype.getCAR = function() {
	var cardo = this.body.find(CVC.TAG_CAR);

	if (!cardo) {
		return null;
	}

	return new PublicKeyReference(cardo.value);
}



/**
 * Returns the certificate holder reference (CHR).
 *
 * @return the CHR
 * @type PublicKeyReference
 */
CVC.prototype.getCHR = function() {
	var chrdo = this.body.find(CVC.TAG_CHR);

	if (!chrdo) {
		throw new GPError("CVC", GPError.OBJECT_NOT_FOUND, 0, "Certificate does not contain a CHR");
	}

	return new PublicKeyReference(chrdo.value);
}



/**
 * Returns the certificate effective date (CED).
 *
 * @return the CED or null
 * @type Date
 */
CVC.prototype.getCED = function() {
	var ceddo = this.body.find(CVC.TAG_CED);

	if (!ceddo) {
		return null
	}

	var b = ceddo.value;

	var d = new Date();
	d.setFullYear(b.byteAt(0) * 10 + b.byteAt(1) + 2000,
				  b.byteAt(2) * 10 + b.byteAt(3) - 1,
				  b.byteAt(4) * 10 + b.byteAt(5));
	d.setHours(12, 0, 0, 0);
	return d;
}



/**
 * Returns the certificate expiration date (CXD).
 *
 * @return the CXD or null
 * @type Date
 */
CVC.prototype.getCXD = function() {
	var cxddo = this.body.find(CVC.TAG_CXD);

	if (!cxddo) {
		return null
	}

	var b = cxddo.value;

	var d = new Date();
	d.setFullYear(b.byteAt(0) * 10 + b.byteAt(1) + 2000,
				  b.byteAt(2) * 10 + b.byteAt(3) - 1,
				  b.byteAt(4) * 10 + b.byteAt(5));
	d.setHours(12, 0, 0, 0);
	return d;
}



/**
 * Returns the outer certification authority reference (CAR).
 *
 * @return the outer CAR or null
 * @type PublicKeyReference
 */
CVC.prototype.getOuterCAR = function() {
	if (!this.isAuthenticatedRequest()) {
		return null;
	}
	var cardo = this.asn.get(1);

	if (!cardo) {
		return null
	}

	return new PublicKeyReference(cardo.value);
}



/**
 * Returns the extension identified by the object identifier.
 *
 * @return the extension including the OID or null if not defined
 * @type ASN1
 */
CVC.prototype.getExtension = function(extoid) {
	var extdo = this.body.find(CVC.TAG_EXTN);

	if (!extdo) {
		return null;
	}

//	print(extdo);

	for (var i = 0; i < extdo.elements; i++) {
		var ext = extdo.get(i);
		var oid = ext.get(0);
		assert(oid.tag == ASN1.OBJECT_IDENTIFIER);
		if (oid.value.equals(extoid)) {
			return ext;
		}
	}
	return null;
}



/**
 * Returns the Certificate Holder Authorization Template.
 *
 * @return the chat or null if not defined
 * @type ASN1
 */
CVC.prototype.getCHAT = function() {
	var chat = this.body.find(CVC.TAG_CHAT);

	return chat;
}



/**
 * Returns the public key object identifier
 *
 * @returns the object identifier assigned to the public key
 * @type ByteString
 */
CVC.prototype.getPublicKeyOID = function() {
	var pdo = this.body.find(CVC.TAG_PUK);
	if (pdo == null) {
		throw new GPError("CVC", GPError.OBJECT_NOT_FOUND, 0, "Certificate does not contain a public key");
	}

	var d = pdo.find(ASN1.OBJECT_IDENTIFIER);
	if (d == null) {
		throw new GPError("CVC", GPError.OBJECT_NOT_FOUND, 0, "Public key does not contain an object identifier");
	}
	return d.value;
}



/**
 * Decode a public key from the TR-03110 format
 *
 * @param {ASN1} pdo the public key data object
 * @param {Key} key the key object to fill
 */
CVC.decodeECPublicKey = function(pdo, key) {

	var d = pdo.find(0x86);		// Public point
	if (d == null) {
		throw new GPError("CVC", GPError.OBJECT_NOT_FOUND, 0, "Certificate does not contain a public key value");
	}

	var b = d.value.bytes(1);
	key.setComponent(Key.ECC_QX, b.left(b.length >> 1));
	key.setComponent(Key.ECC_QY, b.right(b.length >> 1));

	var d = pdo.find(0x81);		// Prime modulus
	if (d != null) {
		key.setComponent(Key.ECC_P, d.value);
	}

	var d = pdo.find(0x82);		// First coefficient a
	if (d != null) {
		key.setComponent(Key.ECC_A, d.value);
	}

	var d = pdo.find(0x83);		// First coefficient b
	if (d != null) {
		key.setComponent(Key.ECC_B, d.value);
	}

	var d = pdo.find(0x84);		// Base Point G
	if (d != null) {
		var b = d.value.bytes(1);
		key.setComponent(Key.ECC_GX, b.left(b.length >> 1));
		key.setComponent(Key.ECC_GY, b.right(b.length >> 1));
	}

	var d = pdo.find(0x85);		// Order of the base point
	if (d != null) {
		key.setComponent(Key.ECC_N, d.value);
	}

	var d = pdo.find(0x87);		// Cofactor f
	if (d != null) {
		key.setComponent(Key.ECC_H, d.value);
	}
}



/**
 * Returns the EC public key contained in the certificate.
 *
 * @param {Key} domParam optional domain parameter if they are not contained in certificate
 * @return the public key object
 * @type Key
 */
CVC.prototype.getECPublicKey = function(domParam) {
	var oid = this.getPublicKeyOID();
	if (CVC.isCurveOID(oid)) {
		var key = new Key();
		key.setComponent(Key.ECC_CURVE_OID, oid);
	} else if (typeof(domParam) != "undefined") {
		var key = new Key(domParam);
	} else {
		if (typeof(this.domParam) != "undefined") {
			var key = new Key(this.domParam);
		} else {
			var key = new Key();
		}
	}

	key.setType(Key.PUBLIC);

	var pdo = this.body.find(CVC.TAG_PUK);
	if (pdo == null) {
		throw new GPError("CVC", GPError.OBJECT_NOT_FOUND, 0, "Certificate does not contain a public key");
	}

	CVC.decodeECPublicKey(pdo, key);

	return key;
}



/**
 * Returns the RSA public key contained in the certificate.
 *
 * @return the public key object
 * @type Key
 */
CVC.prototype.getRSAPublicKey = function() {
	var key = new Key();

	key.setType(Key.PUBLIC);

	var pdo = this.body.find(CVC.TAG_PUK);
	if (pdo == null) {
		throw new GPError("CVC", GPError.OBJECT_NOT_FOUND, 0, "Certificate does not contain a public key");
	}

	var d = pdo.find(0x81);		// modulus
	if (d != null) {
		key.setComponent(Key.MODULUS, d.value);
	}

	var d = pdo.find(0x82);		// public exponent
	if (d != null) {
		key.setComponent(Key.EXPONENT, d.value);
	}

	return key;
}



/**
 * Returns the public key contained in the certificate.
 *
 * @param {Key} domParam optional domain parameter if they are not contained in certificate
 * @return the public key object
 * @type Key
 */
CVC.prototype.getPublicKey = function(domParam) {
	var pkoid = this.getPublicKeyOID();

	if (CVC.isECDSA(pkoid)) {
		return this.getECPublicKey(domParam);
	}
	return this.getRSAPublicKey();
}



/**
 * Determine the SubjectKeyIdentifier as defined in X.509
 *
 * @return the key identifier
 * @type ByteString
 */
CVC.prototype.determineKeyIdentifier = function() {
	var pdo = this.body.find(CVC.TAG_PUK);
	if (pdo == null) {
		throw new GPError("CVC", GPError.OBJECT_NOT_FOUND, 0, "Certificate does not contain a public key");
	}

	var pkoid = this.getPublicKeyOID();

	var keybin;
	if (CVC.isECDSA(pkoid)) {
		var d = pdo.find(0x86);		// Public point
		keybin = d.value;
	} else {
		var modulus = pdo.find(0x81).value;		// modulus
		if (modulus.byteAt(0) >= 0x80) {
			modulus = ByteString.valueOf(0).concat(modulus);
		}
		var exponent = pdo.find(0x82).value;		// public exponent
		var rsapub = new ASN1("RSAPublicKey", ASN1.SEQUENCE,
				      new ASN1("modulus", ASN1.INTEGER, modulus),
				      new ASN1("publicKeyExponent", ASN1.INTEGER, exponent));

		keybin = rsapub.getBytes();
	}
	return CVC.crypto.digest(Crypto.SHA_1, keybin);
}



/**
 * Determine if this is an authenticated request
 *
 * @returns true, if authenticated request
 * @type Boolean
 */
CVC.prototype.isAuthenticatedRequest = function() {
	return (this.asn.tag == CVC.TAG_AT);
}



/**
 * Determine if this is a certificate request
 *
 * @returns true, if certificate request
 * @type Boolean
 */
CVC.prototype.isCertificateRequest = function() {
	if (this.isAuthenticatedRequest()) {
		return true;
	}

	var ced = this.getCED();
	return ced == null;
}



/**
 * Determine if this is a countersigned authenticated request
 *
 * @returns true, if countersigned authenticated request
 * @type Boolean
 */
CVC.prototype.isCountersignedRequest = function() {
	if (!this.isAuthenticatedRequest()) {
		return false;
	}
	return (this.getCHR().getHolder() != this.getOuterCAR().getHolder());
}



/**
 * Determine if this certificate is expired
 *
 * @returns true, if certificate is expired
 * @type Boolean
 */
CVC.prototype.isExpired = function() {
	var now = new Date();
	now.setHours(12, 0, 0, 0);
	return (now.valueOf() > this.getCXD().valueOf());
}



/**
 * Verify certificate signature with public key
 *
 * @param {Crypto} crypto the crypto instance to use for verification
 * @param {Key} puk the public key
 * @param {ByteString} oid the signature algorithm
 * @returns true if the signature is valid
 * @type Boolean
 */
CVC.prototype.verifyWith = function(crypto, puk, oid) {
	if (this.asn.tag == CVC.TAG_AT) {
		var signature = this.asn.get(0).get(1);
	} else {
		var signature = this.asn.get(1);
	}

	if (typeof(oid) == "undefined") {
		var oid = this.getPublicKeyOID();
	}
	var mech = CVC.getSignatureMech(oid, puk.getSize());

	if (CVC.isECDSA(oid)) {
		var signatureValue = CVC.wrapSignature(signature.value);
		this.domParam = puk;
	} else {
		var signatureValue = signature.value;
	}

	return crypto.verify(puk, mech, this.body.getBytes(), signatureValue);
}



/**
 * Verify certificate signature with public key from card verifiable certificate
 *
 * @param {CVC} cvc the card verifiable certificate used to obtain the public key
 * @returns true if the signature is valid
 * @type Boolean
 */
CVC.prototype.verifyWithCVC = function(crypto, cvc) {
	return this.verifyWith(crypto, cvc.getPublicKey(), cvc.getPublicKeyOID());
}



/**
 * Verify outer signature of an authenticated request with public key
 *
 * @param {Key} puk the public key
 * @param {ByteString} oid the signature algorithm
 * @returns true if the signature is valid
 * @type Boolean
 */
CVC.prototype.verifyATWith = function(crypto, puk, oid) {
	if (!this.isAuthenticatedRequest()) {
		throw new GPError("CVC", GPError.INVALID_DATA, 0, "Not an authenticated request");
	}

	var signature = this.asn.get(2);
	var signatureInput = this.asn.get(0).getBytes().concat(this.asn.get(1).getBytes());

	if (typeof(oid) == "undefined") {
		var oid = this.getPublicKeyOID();
	}
	var mech = CVC.getSignatureMech(oid);

	if (CVC.isECDSA(oid)) {
		var signatureValue = CVC.wrapSignature(signature.value);
	} else {
		var signatureValue = signature.value;
	}
	return crypto.verify(puk, mech, signatureInput, signatureValue);
}



/**
 * Verify outer signature of an authenticated request with public key from card verifiable certificate
 *
 * @param {CVC} cvc the card verifiable certificate used to obtain the public key
 * @returns true if the signature is valid
 * @type Boolean
 */
CVC.prototype.verifyATWithCVC = function(crypto, cvc) {
	return this.verifyATWith(crypto, cvc.getPublicKey(), cvc.getPublicKeyOID());
}



/**
 * Returns the encoded certificate
 *
 * @return the DER encoded certificate
 * @type ByteString
 */
CVC.prototype.getBytes = function() {
	return this.bin;
}



/**
 * Returns the certificate as ASN1 structure
 *
 * @return the certificate as ASN1 structure
 * @type ASN1
 */
CVC.prototype.getASN1 = function() {
	return this.asn;
}



/**
 * Function to recursively walk the ASN.1 tree
 */
CVC.decorateTree = function(node) {
	var name = CVC.OBJECTNAMES[node.tag];

	if (name) {
		node.setName(name);
	}

	if (node.isconstructed) {
		for (var i = 0; i < node.elements; i++) {
			CVC.decorateTree(node.get(i));
		}
	}
}



/**
 * Decorate the ASN.1 object with the correct name
 */
CVC.prototype.decorate = function() {
	CVC.decorateTree(this.asn);
	var cxddo = this.body.find(CVC.TAG_CXD);
	if (cxddo == null) {
		if (this.asn.tag == CVC.TAG_AT) {
			this.asn.setName("Authenticated CVC Request");
		} else {
			this.asn.setName("CVC Request");
		}
	}
}



/**
 * Return list of rights granted by the certificate
 *
 * @returns the list of rights
 * @type String[]
 */
CVC.prototype.getRightsAsList = function() {
	var list = [];

	var rtab;
	var chat = this.getCHAT();
	if (chat == null) {
		return list;
	}

	var oid = chat.get(0).value;

	if (oid.equals(CVC.idIS)) {
		rtab = CVC.ISRIGHTS;
	} else if (oid.equals(CVC.idAT)) {
		rtab = CVC.ATRIGHTS;
	} else if (oid.equals(CVC.idST)) {
		rtab = CVC.STRIGHTS;
	} else {
		return null;
	}

	var mask = chat.get(1).value;
	var c = 0;
	for (var i = mask.length - 1; i >= 0; i--) {
		var akku = mask.byteAt(i);
		for (var j = 0; j < (i == 0 ? 6 : 8); j++) {
			if (akku & 1) {
				list.push(rtab[c]);
			}
			c++;
			akku >>= 1;
		}
	}
	return list;
}



/**
 * Return position of certificate in PKI hierachie
 *
 * @returns Position in PKI hierachie: 0 unknown, 1-CVCA, 2-DVCA, 3-Terminal
 * @type Number
 */
CVC.prototype.getLevel = function() {
	var chat = this.getCHAT();
	if (!chat) {
		return 0;
	}

	var l = chat.get(1).value.byteAt(0) & 0xC0;
	if (l == 0xC0) {
		return 1;
	}
	return l == 0x00 ? 3 : 2;
}



/**
 * Return a string describing the certificate type
 *
 * @returns a describing string
 * @type String
 */
CVC.prototype.getType = function() {
	var ced = this.getCED();
	var chat = this.getCHAT();

	// Decode certificate / request type
	var str = "CVC ";
	if (ced == null) {
		if (this.asn.tag == CVC.TAG_AT) {
			str = "AT-CVREQ ";
		} else {
			str = "CVREQ ";
		}
	}

	// Decode CA type
	if (chat != null) {
		var oid = chat.get(0).value;

		if (oid.equals(CVC.idSC_HSM)) {
			str += "id-SC-HSM ";
			switch(chat.get(1).value.byteAt(0) & 0xC0) {
				case 0xC0: str += "SRCA "; break;
				case 0x80: str += "DICA "; break;
				case 0x40: str += "MICA "; break;
				case 0x00: str += "Device "; break;
			}
		} else {
			var trustedDV = "";
			var untrustedDV = "";

			if (oid.equals(CVC.idIS)) {
				str += "id-IS ";
				trustedDV = "(official domestic) ";
				untrustedDV = "(official foreign) ";
			} else if (oid.equals(CVC.idAT)) {
				str += "id-AT ";
				trustedDV = "(official domestic) ";
				untrustedDV = "(non-official / foreign) ";
			} else if (oid.equals(CVC.idST)) {
				str += "id-ST ";
				trustedDV = "(accreditation body) ";
				untrustedDV = "(certification service provider) ";
			} else {
				str += oid.toString(OID) + " ";
			}

			switch(chat.get(1).value.byteAt(0) & 0xC0) {
				case 0xC0: str += "CVCA "; break;
				case 0x80: str += "DV " + trustedDV; break;
				case 0x40: str += "DV " + untrustedDV; break;
				case 0x00: str += "Terminal "; break;
			}
		}
	}

	return str;
}



/**
 * Return a textual description of the certificate
 *
 * @returns a string containing information about the certificate
 * @type String
 */
CVC.prototype.toString = function() {
	var car = this.getCAR();
	var ced = this.getCED();

	var str = this.getType();

	if (car) {
		str += "CAR=" + car.toString() + " ";
	}

	str += "CHR=" + this.getCHR().toString() + " ";

	if (ced) {
		str += "CED=" + ced.toLocaleDateString() + " ";
	}

	var cxd = this.getCXD();
	if (cxd) {
		str += "CXD=" + cxd.toLocaleDateString() + " ";
	}

	if (this.isAuthenticatedRequest()) {
		str += "oCAR=" + this.getOuterCAR().toString() + " ";
	}

	return str;
}



/**
 * Return object suitable for JSON encoding
 *
 * @returns a JSON encodable object
 * @type Object
 */
CVC.prototype.toJSON = function() {
	return { clazz: "CVC", value: this.bin };
}



/**
 * Recreate object from JSON encoding
 *
 * @returns the CVC object
 * @type Object
 */
CVC.fromJSON = function(obj) {
	assert(obj.clazz.equals("CVC"), "JSON object must contain clazz: CVC");
	return new CVC(obj.value);
}
