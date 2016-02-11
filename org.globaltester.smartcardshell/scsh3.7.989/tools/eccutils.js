/*
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
 *  Utility class for Elliptic Curve Cryptography
 */

 
function ECCUtils() {
}



/**
 * Wrap a ECDSA signature in the format r || s into a TLV encoding as defined by RFC 3279
 *
 * @param signature ByteString containing the concatenation of r and s as unsigned integer values
 * @returns ASN.1 SEQUENCE objects containing two signed integer r and s
 */
ECCUtils.wrapSignature = function(signature) {
	var len = signature.length / 2;
	
	// r and s are big integer. We pad a zero to prevent interpretation as signed integer
	var r = new ByteString("00", HEX);
	r = r.concat(signature.bytes(0, len));

	var s = new ByteString("00", HEX);
	s = s.concat(signature.bytes(len, len));

	var t = new ASN1(ASN1.SEQUENCE);
	t.add(new ASN1(ASN1.INTEGER, r));
	t.add(new ASN1(ASN1.INTEGER, s));

	return t.getBytes();
}



/**
 * Integer to octet string conversion
 */
ECCUtils.I2O = function(value, length) {
	if (value.length > length) {
		value = value.right(length);
	}
	while (value.length < length) {
		value = ECCUtils.PAD.left((length - value.length - 1 & 15) + 1).concat(value);
	}
	return value;
}
ECCUtils.PAD = new ByteString("00000000000000000000000000000000", HEX);



/**
 * Unwrap a ECDSA signature from the TLV encoding according to RFC3279 into the concatenation
 * of the unsigned integer r and s
 *
 * @param signature TLV encoded signature
 * @returns concatenation of r and s
 */
ECCUtils.unwrapSignature = function(signature, keylen) {
	var t = new ASN1(signature);
	if (typeof(keylen) != "undefined") {
		var r = ECCUtils.I2O(t.get(0).value, keylen);
		var s = ECCUtils.I2O(t.get(1).value, keylen);
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
 * Decode domain parameter from ECParameters
 *
 * <pre>
 *	ECParameters ::= SEQUENCE {
 *		version INTEGER{ecpVer1(1)} (ecpVer1),
 *		fieldID FieldID,
 *		curve Curve,
 *		base ECPoint,
 *		order INTEGER,
 *		cofactor INTEGER OPTIONAL,
 *		...
 *	}
 *
 *	Curve ::= SEQUENCE {
 *		a FieldElement,
 *		b FieldElement,
 *		seed BIT STRING OPTIONAL
 *	}
 *
 *	FieldElement ::= OCTET STRING
 *	ECPoint ::= OCTET STRING
 *	FieldID ::= SEQUENCE {
 *		fieldType OBJECT IDENTIFIER,
 *		parameters ANY DEFINED BY fieldType
 *	}
 *	prime-field OBJECT IDENTIFIER ::= { ansi-x9-62 fieldType(1) 1 }
 *	Prime-p ::= INTEGER 
 * </pre>
 */
ECCUtils.decodeECParameters = function(tlv) {
	assert(tlv.tag == ASN1.SEQUENCE);
	
	var key = new Key();
	key.setType(Key.PUBLIC);
	
	// version
	assert(tlv.get(0).value.toSigned() == 1);
	
	// fieldID
	assert(tlv.get(1).tag == ASN1.SEQUENCE);
	assert(tlv.get(1).get(1).tag = ASN1.INTEGER);
	
	var prime = tlv.get(1).get(1).value;
	if (prime.byteAt(0) == 0) {		// Strip leading zero byte
		prime = prime.bytes(1);
	}
	key.setComponent(Key.ECC_P, prime);
	
	// curve
	assert(tlv.get(2).tag == ASN1.SEQUENCE);
	assert(tlv.get(2).get(0).tag == ASN1.OCTET_STRING);

	var coeff_A = tlv.get(2).get(0);
	key.setComponent(Key.ECC_A, coeff_A.value);
	
	var coeff_B = tlv.get(2).get(1);
	key.setComponent(Key.ECC_B, coeff_B.value);

	// base
	assert(tlv.get(3).tag == ASN1.OCTET_STRING);
	var pkbin = tlv.get(3).value;
	assert(pkbin.byteAt(0) == 4);
	pkbin = pkbin.bytes(1);
	
	key.setComponent(Key.ECC_GX, pkbin.left(pkbin.length >> 1));
	key.setComponent(Key.ECC_GY, pkbin.right(pkbin.length >> 1));
	
	// order
	assert(tlv.get(4).tag == ASN1.INTEGER);
	var groupOrder = tlv.get(4).value;
	if (groupOrder.byteAt(0) == 0) {		// Strip leading zero byte
		groupOrder = groupOrder.bytes(1);
	}
	key.setComponent(Key.ECC_N, groupOrder);
	
	// cofactor
	if (tlv.elements > 5) {
		assert(tlv.get(5).tag == ASN1.INTEGER);
		var cofactor = tlv.get(0).value;
		if (cofactor.byteAt(0) == 0) {		// Strip leading zero byte
			cofactor = cofactor.bytes(1);
		}
		key.setComponent(Key.ECC_H, cofactor);
	}
	
	return key;
}



ECCUtils.ECParametersToString = function(key) {
	var str = "EC Parameter:\n";
	
	str += "  prime " + key.getComponent(Key.ECC_P) + "\n";
	str += "  curve a " + key.getComponent(Key.ECC_A) + "\n";
	str += "  curve b " + key.getComponent(Key.ECC_B) + "\n";
	str += "  generator x " + key.getComponent(Key.ECC_GX) + "\n";
	str += "  generator y " + key.getComponent(Key.ECC_GY) + "\n";
	str += "  order " + key.getComponent(Key.ECC_N) + "\n";
	str += "  cofactor " + key.getComponent(Key.ECC_H) + "\n";
	return str;
}



// List of object identifier used in Key.setComponent(ECC_CURVE_OID)

// Fp curves defined by ANSI X6.92
ECCUtils.prime192v1 = new ByteString("1.2.840.10045.3.1.1", OID);
ECCUtils.prime192v2 = new ByteString("1.2.840.10045.3.1.2", OID);
ECCUtils.prime192v3 = new ByteString("1.2.840.10045.3.1.3", OID);
ECCUtils.prime239v1 = new ByteString("1.2.840.10045.3.1.4", OID);
ECCUtils.prime239v2 = new ByteString("1.2.840.10045.3.1.5", OID);
ECCUtils.prime239v3 = new ByteString("1.2.840.10045.3.1.6", OID);
ECCUtils.prime256v1 = new ByteString("1.2.840.10045.3.1.7", OID);

// F2m curves defined by ANSI X6.92
ECCUtils.c2pnb163v1 = new ByteString("1.2.840.10045.3.0.1", OID);
ECCUtils.c2pnb163v2 = new ByteString("1.2.840.10045.3.0.2", OID);
ECCUtils.c2pnb163v3 = new ByteString("1.2.840.10045.3.0.3", OID);
ECCUtils.c2pnb176w1 = new ByteString("1.2.840.10045.3.0.4", OID);
ECCUtils.c2tnb191v1 = new ByteString("1.2.840.10045.3.0.5", OID);
ECCUtils.c2tnb191v2 = new ByteString("1.2.840.10045.3.0.6", OID);
ECCUtils.c2tnb191v3 = new ByteString("1.2.840.10045.3.0.7", OID);
ECCUtils.c2pnb208w1 = new ByteString("1.2.840.10045.3.0.10", OID);
ECCUtils.c2tnb239v1 = new ByteString("1.2.840.10045.3.0.11", OID);
ECCUtils.c2tnb239v2 = new ByteString("1.2.840.10045.3.0.12", OID);
ECCUtils.c2tnb239v3 = new ByteString("1.2.840.10045.3.0.13", OID);
ECCUtils.c2pnb272w1 = new ByteString("1.2.840.10045.3.0.16", OID);
ECCUtils.c2pnb304w1 = new ByteString("1.2.840.10045.3.0.17", OID);
ECCUtils.c2tnb359v1 = new ByteString("1.2.840.10045.3.0.18", OID);
ECCUtils.c2pnb368w1 = new ByteString("1.2.840.10045.3.0.19", OID);
ECCUtils.c2tnb431r1 = new ByteString("1.2.840.10045.3.0.20", OID);

// Fp curves defined by SECG
ECCUtils.secp224r1 = new ByteString("1.3.132.0.33", OID);
ECCUtils.secp256r1 = ECCUtils.prime256v1;
ECCUtils.secp384r1 = new ByteString("1.3.132.0.34", OID);
ECCUtils.secp521r1 = new ByteString("1.3.132.0.35", OID);
 
// F2m curves defined by SECG
ECCUtils.sect163r2 = new ByteString("1.3.132.0.15", OID);
ECCUtils.sect233r1 = new ByteString("1.3.132.0.27", OID);
ECCUtils.sect283r1 = new ByteString("1.3.132.0.17", OID);
ECCUtils.sect409r1 = new ByteString("1.3.132.0.37", OID);
ECCUtils.sect571r1 = new ByteString("1.3.132.0.39", OID);

ECCUtils.brainpoolP160r1 = new ByteString("1.3.36.3.3.2.8.1.1.1", OID);
ECCUtils.brainpoolP160t1 = new ByteString("1.3.36.3.3.2.8.1.1.2", OID);
ECCUtils.brainpoolP192r1 = new ByteString("1.3.36.3.3.2.8.1.1.3", OID);
ECCUtils.brainpoolP192t1 = new ByteString("1.3.36.3.3.2.8.1.1.4", OID);
ECCUtils.brainpoolP224r1 = new ByteString("1.3.36.3.3.2.8.1.1.5", OID);
ECCUtils.brainpoolP224t1 = new ByteString("1.3.36.3.3.2.8.1.1.6", OID);
ECCUtils.brainpoolP256r1 = new ByteString("1.3.36.3.3.2.8.1.1.7", OID);
ECCUtils.brainpoolP256t1 = new ByteString("1.3.36.3.3.2.8.1.1.8", OID);
ECCUtils.brainpoolP320r1 = new ByteString("1.3.36.3.3.2.8.1.1.9", OID);
ECCUtils.brainpoolP320t1 = new ByteString("1.3.36.3.3.2.8.1.1.10", OID);
ECCUtils.brainpoolP384r1 = new ByteString("1.3.36.3.3.2.8.1.1.11", OID);
ECCUtils.brainpoolP384t1 = new ByteString("1.3.36.3.3.2.8.1.1.12", OID);
ECCUtils.brainpoolP512r1 = new ByteString("1.3.36.3.3.2.8.1.1.13", OID);
ECCUtils.brainpoolP512t1 = new ByteString("1.3.36.3.3.2.8.1.1.14", OID);

/* Test all curve parameter
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.prime192v1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.prime192v2);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.prime192v3);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.prime239v1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.prime239v2);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.prime239v3);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.prime256v1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2pnb163v1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2pnb163v2);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2pnb163v3);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2pnb176w1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2tnb191v1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2tnb191v2);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2tnb191v3);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2pnb208w1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2tnb239v1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2tnb239v2);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2tnb239v3);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2pnb272w1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2pnb304w1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2tnb359v1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2pnb368w1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.c2tnb431r1);

var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.secp224r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.secp256r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.secp384r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.secp521r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.sect163r2);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.sect233r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.sect283r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.sect409r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.sect571r1);

var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP160r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP160t1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP192r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP192t1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP224r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP224t1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP256r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP256t1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP320r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP320t1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP384r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP384t1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP512r1);
var k = new Key();
k.setComponent(Key.ECC_CURVE_OID, ECCUtils.brainpoolP512t1);
*/