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
 * @fileoverview Basic helper functions to encode and decode PKCS#1 padding
 */



/**
 * Empty constructor
 */
function PKCS1() {
}

if (typeof(exports) != "undefined")
	exports.PKCS1 = PKCS1;


/**
 * Mask Generation Function 1
 * 
 * @param {Crypto} crypto instance providing hash
 * @param {Number} hashalg Hash algorithm (one of Crypto.SHA_xxx)
 * @param {ByteString} mgfSeed Seed byte string
 * @param {Number} maskLen length of requested masked
 * @type ByteString
 * @return the generated mask
 */
PKCS1.MGF1 = function(crypto, hashalg, mgfSeed, maskLen) {
	if ((maskLen < 0) || (maskLen > 256)) {
		throw new Error("maskLen out of range");
	}
	var t = new ByteString("", HEX);
	
	var c = 0;
	while (t.length < maskLen) {
		t = t.concat(crypto.digest(hashalg, mgfSeed.concat(ByteString.valueOf(c, 4))));
		c++;
	}
	return t.left(maskLen);
}



/**
 * EME-OAEP decoder as defined in PKCS#1 V2.1 chapter 7.1.2
 * 
 * @param {Crypto} crypto instance providing hash function
 * @param {ByteString} label additional label for encryption
 * @param {Number} hashalg Hash algorithm (one of Crypto.SHA_xxx)
 * @param {ByteString} em encoded messages after RSA decrypt
 * @type ByteString
 * @return null if padding error or recovered message
 */
PKCS1.decode_EME_OAEP = function(crypto, label, hashalg, em) {
	if (!label) {
		label = new ByteString("", HEX);
	}
	
	var lHash = crypto.digest(hashalg, label);
	var hLen = lHash.length;
	var y = em.byteAt(0);
	var maskedSeed = em.bytes(1, hLen);
	var maskedDB = em.bytes(1 + hLen);
	
	var seedMask = PKCS1.MGF1(crypto, hashalg, maskedDB, hLen);
	var seed = maskedSeed.xor(seedMask);
	var dbMask = PKCS1.MGF1(crypto, hashalg, seed, em.length - hLen - 1);
	var DB = maskedDB.xor(dbMask);
	
	var c1 = y == 0;
	var c2 = DB.left(hLen).equals(lHash);
	var cnt = 0;
	var i = hLen;
	for (; (i < DB.length) && (DB.byteAt(i) != 0x01); i++) {
		cnt += (DB.byteAt(i) == 0x00) ? 1 : 0;
	}
	
	var c3 = i < DB.length;
	var c4 = cnt == (i - hLen);
	
	if (!c1 || !c2 || !c3 || !c4) {
		return null;
	}
	return DB.bytes(i + 1);
}



/**
 * EME-PKCS1-v1_5 decoder as defined in PKCS#1 V2.1 chapter 7.2.2
 * 
 * @param {ByteString} em encoded messages after RSA decrypt
 * @type ByteString
 * @return null if padding error or recovered message
 */
PKCS1.decode_EME_V15 = function(em) {
	var c1 = em.byteAt(0) == 0;
	var c2 = em.byteAt(1) == 2;
	
	for (i = 2; (i < em.length) && (em.byteAt(i) != 0x00); i++);

	var c3 = i < em.length;
	
	if (!c1 || !c2 || !c3) {
		return null;
	}
	return em.bytes(i + 1);
}



PKCS1.ALLFF = new ByteString("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF", HEX);

/**
 * EMSA-PKCS-v1_5 encoder as defined in PKCS#1 V2.1 chapter 9.2
 * 
 * This method uses the length of the hash to determine the hash algorithm, i.e. MD5(16), SHA-1(20), SHA-224(24), SHA-256(32), SHA-384(48) or SHA-512(64)
 * 
 * @param {Number} keysize the key size in bits
 * @param {ByteString} hash the hash value
 * @type ByteString
 * @return the encoded message
 */
PKCS1.encode_EMSA_V15 = function(keysize, hash) {
	switch(hash.length) {
		case 16:
			var oid = new ByteString("id-md5", OID);
			break;
		case 20:
			var oid = new ByteString("id-sha1", OID);
			break;
		case 24:
			var oid = new ByteString("id-sha224", OID);
			break;
		case 32:
			var oid = new ByteString("id-sha256", OID);
			break;
		case 48:
			var oid = new ByteString("id-sha384", OID);
			break;
		case 64:
			var oid = new ByteString("id-sha512", OID);
			break;
		default:
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "Invalid hash length");
	}
	var di = new ASN1(ASN1.SEQUENCE,
			new ASN1(ASN1.SEQUENCE,
				new ASN1(ASN1.OBJECT_IDENTIFIER, oid),
				new ASN1(ASN1.NULL, new ByteString("", HEX))
			    ),
			new ASN1(ASN1.OCTET_STRING, hash)
		     );
	
	var t = di.getBytes();
	var em = new ByteBuffer("0001", HEX);
	var pslen = (keysize >> 3) - t.length - 3;
	while (pslen > 0) {
		var l = pslen > 256 ? 256 : pslen;
		em.append(PKCS1.ALLFF.left(l));
		pslen -= l;
	}
	em.append(0x00);
	em.append(t);
	return em.toByteString();
}
