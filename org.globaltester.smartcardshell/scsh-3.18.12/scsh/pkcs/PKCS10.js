/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2015 CardContact Software & System Consulting
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
 * @fileoverview PKCS#10 Decoder
 */

var PKIXCommon = require('scsh/x509/PKIXCommon').PKIXCommon;
var X509Name = require('scsh/x509/X509Name').X509Name;


/**
 * Class supporting PKCS#10 certificate signing requests
 *
 * @param {ASN1} req the certificate request
 */
function PKCS10(req) {

	if (req instanceof ASN1) {
		this.req = req;
	} else if (req instanceof ByteString) {
		var asn = new ASN1(req);
		this.req = asn;
	} else {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "Argument must be either type of ByteString or ASN1");
	}

	this.reqInfo = this.req.get(0);
	this.sigAlg = this.req.get(1);
	this.sig = this.req.get(2);
}

exports.PKCS10 = PKCS10;

PKCS10.RSA = new ByteString("rsaEncryption", OID);
PKCS10.RSA_PSS = new ByteString("id-RSASSA-PSS", OID);
PKCS10.EC = new ByteString("id-ecPublicKey", OID);



/**
 * Get the encoded request
 *
 * @return the encoded request
 * @type ByteString
 */
PKCS10.prototype.getBytes = function() {
	return this.req.getBytes();
}



/**
 * Gets the subject name as TLV object
 *
 * @return the issuer RDNSequence
 * @type ASN1
 */
PKCS10.prototype.getSubject = function() {
	return this.reqInfo.get(1);
}



/**
 * Get the public key
 *
 * @type key
 * @return the public key
 */
PKCS10.prototype.getPublicKey = function() {
	var algorithm = this.reqInfo.get(2).get(0).get(0).value;

	var bitString = this.reqInfo.get(2).get(1).value;	// subjectPublicKey
	bitString = PKIXCommon.removeLeadingZeroBytes(bitString);

	var key = new Key();
	key.setType(Key.PUBLIC);

	if (algorithm.equals(PKCS10.RSA) || algorithm.equals(PKCS10.RSA_PSS)) {
		var p = new ASN1(bitString);
		key.setComponent(Key.MODULUS, PKIXCommon.removeLeadingZeroBytes(p.get(0).value));
		key.setComponent(Key.EXPONENT, PKIXCommon.removeLeadingZeroBytes(p.get(1).value));
	} else {
		key.setComponent(Key.ECC_CURVE_OID, this.reqInfo.get(2).get(0).get(1).value);
		if (bitString.byteAt(0) != 4) {
			throw new GPError(module.id, GPError.INVALID_MECH, 0, "Only uncompressed keys supported (04)");
		}
		var l = (bitString.length - 1) >> 1;
		key.setComponent(Key.ECC_QX, bitString.bytes(1, l));
		key.setComponent(Key.ECC_QY, bitString.bytes(1 + l, l));
	}

	return key;
}



/**
 * Get the signature algorithm as Crypto.X constant
 *
 * @type Number
 * @return the signature algorithm
 */
PKCS10.prototype.getSignatureAlgorithm = function() {
	var algOID = this.sigAlg.get(0).value;
	if (this.sigAlg.elements > 1) {
		var param = this.sigAlg.get(1).getBytes();
	}
	var alg = PKIXCommon.decodeSignatureAlgorithm(algOID, param);

	if (!alg) {
		throw new GPError(module.id, GPError.INVALID_MECH, alg, "Invalid algorithm");
	}
	return alg;
}



/**
 * Get the signature value
 *
 * @type ByteString
 * @return the signature
 */
PKCS10.prototype.getSignature = function() {
	var signature = this.sig.value;

	if (signature.byteAt(0) == 0x00) {
		signature = signature.bytes(1);
	}
	return signature;
}



/**
 * Verify signature
 *
 * @param {Key} pubKey optional public key to use for verification
 * @type boolean
 * @return true if signature is valid
 */
PKCS10.prototype.verify = function(pubKey) {
	var crypto = new Crypto();
	if (!pubKey) {
		pubKey = this.getPublicKey();
	}
	var alg = this.getSignatureAlgorithm();
	var signature = this.getSignature();

	return crypto.verify(pubKey, alg, this.reqInfo.getBytes(), signature);
}



PKCS10.prototype.toString = function() {
	var s = "PKCS#10 Request:";

	var k = this.getPublicKey();
	if (k.getComponent(Key.MODULUS)) {
		s+= "Type=RSA,";
	} else {
		s+= "Type=EC,";
		var curve = ASN1.nameForObjectIdentifier(k.getComponent(Key.ECC_CURVE_OID));
		if (curve) {
			s += "Curve=" + curve + ",";
		}
	}
	s+= "Size=" + k.getSize();

	var subject = this.getSubject();
	if (subject) {
		var xName = new X509Name(subject)
		s += "," + xName.toString();
	}

	return s;
}
