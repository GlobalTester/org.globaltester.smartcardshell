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
 * @fileoverview Common classes and functions for PKIX
 */

 

/**
 * Common functions and constants
 */
function PKIXCommon() {
}


PKIXCommon.digitalSignature	= 0x0080;
PKIXCommon.nonRepudiation		= 0x0040;
PKIXCommon.keyEncipherment		= 0x0020;
PKIXCommon.dataEncipherment	= 0x0010;
PKIXCommon.keyAgreement		= 0x0008;
PKIXCommon.keyCertSign			= 0x0004;
PKIXCommon.cRLSign				= 0x0002;
PKIXCommon.encipherOnly		= 0x0001;
PKIXCommon.decipherOnly		= 0x8000;


 
/**
 * Convert integer to fixed length string with leading zeros.
 *
 * @private
 * @param {Number} value the value to convert to a string.
 * @param {Number} digits the number of digits in output string. Must be <= 20.
 * @return the 0-padded string
 * @type String
 */
PKIXCommon.itos = function(value, digits) {
	if (digits > 20) {
		throw new Error("Digits must be <= 20");
	}
	var str = "" + value;
	str = "0000000000000000000".substr(19 - (digits - str.length)).concat(str);
	return str;
}



/**
 * Convert date and time to UTC string with format YYMMDDHHMMSSZ.
 *
 * @param {Date} d the date object.
 * @return the date/time string.
 * @type String
 */
PKIXCommon.dtoUTC = function(d) {
	var s = PKIXCommon.itos(d.getUTCFullYear() % 100, 2) +
			PKIXCommon.itos(d.getUTCMonth() + 1, 2) +
			PKIXCommon.itos(d.getUTCDate(), 2) +
			PKIXCommon.itos(d.getUTCHours(), 2) +
			PKIXCommon.itos(d.getUTCMinutes(), 2) +
			PKIXCommon.itos(d.getUTCSeconds(), 2) + "Z";
	return s;
}



/**
 * Add the specified number of days to a date object
 * 
 * @param {Date} d the date object
 * @param {Number} days the number of days to add, may be negative
 * @type Date
 * @return a new Date object
 */
PKIXCommon.addDays = function(d, days) {
	var hour = d.getUTCHours();
	var minute = d.getUTCMinutes();
	var second = d.getUTCSeconds();
	var cd = new Date(d);
	cd.setHours(12);
	
	var ts = cd.getTime();
	ts += days * 24 * 60 * 60 * 1000;
	var nd = new Date(ts);
	
	nd.setUTCHours(hour);
	nd.setUTCMinutes(minute);
	nd.setUTCSeconds(second);
	return nd;
}



/**
 * Converts the integer value into a BIT STRING value.
 * <p>The function interprets the integer value as bitmap, where
 * bit 0 is the most significant bit of the least significant byte.</p>
 * <p>The function adds the minimum number of bytes to the final bit string
 * and encodes the "number of unused bits at the beginning.</p>
 * 
 * @param {Number} val the value to convert
 * @return the bit string
 * @type ByteString
 */
PKIXCommon.bitstringForInteger = function(val) {
	var bb = new ByteBuffer();
	var b = 0;
	
	// Encode starting with the least significant byte
	while (val > 0) {
		b = val & 0xFF;
		bb.append(b);
		val = val >> 8;
	}
	
	// Determine number of unused bits
	var i = 0;
	while ((i < 8) && !(b & 1)) {
		i++;
		b >>= 1;
	}
	
	bb.insert(0, i);
	return bb.toByteString();
}



/**
 * Removes leading zeros and prepends a single '00' to ByteStrings which have the most significant bit set.
 *
 * This prevent interpretation of the integer representation if converted into
 * a signed ASN1 INTEGER.
 *
 * @param {ByteString} value the value to convert
 * @return the converted value
 * @type ByteString
 */
PKIXCommon.convertUnsignedInteger = function(value) {
	assert(value.length > 0);
	
	var i = 0;
	for (var i = 0; (i < value.length - 1) && (value.byteAt(i) == 0); i++);
	
	if (value.byteAt(i) >= 0x80) {
		value = (new ByteString("00", HEX)).concat(value.bytes(i));
	} else {
		value = value.bytes(i);
	}
	
	return value;
}



/**
 * Creates the EC Public Key as subjectPublicKeyInfo TLV structure object.
 *
 * <p>The structure is defined as:</p>
 * <pre>
 *	SubjectPublicKeyInfo  ::=  SEQUENCE  {
 *		algorithm            AlgorithmIdentifier,
 *		subjectPublicKey     BIT STRING  }
 *
 *	AlgorithmIdentifier  ::=  SEQUENCE  {
 *		algorithm               OBJECT IDENTIFIER,
 *		parameters              ANY DEFINED BY algorithm OPTIONAL  }
 * 
 *	id-ecPublicKey OBJECT IDENTIFIER ::= {
 *		iso(1) member-body(2) us(840) ansi-X9-62(10045) keyType(2) 1 }
 *
 *	ECParameters ::= CHOICE {
 *		namedCurve         OBJECT IDENTIFIER,
 *		implicitCurve      NULL,
 *		specifiedCurve     SpecifiedECDomain }
 * </pre>
 * @return the subjectPublicKey TLV structure
 * @type ASN1
 */
PKIXCommon.createECSubjectPublicKeyInfo = function(publicKey, encodeECDomainParameter) {
	var t = new ASN1("subjectPublicKeyInfo", ASN1.SEQUENCE);

	var algorithm = new ASN1("algorithm", ASN1.SEQUENCE,
			new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.10045.2.1", OID))
		);

	if (encodeECDomainParameter) {
		if (publicKey.getComponent(Key.ECC_P)) {		// Make sure curve components are available if only curve oid is defined
			publicKey.setComponent(Key.ECC_CURVE_OID, publicKey.getComponent(Key.ECC_CURVE_OID));
		}
		var ecParameter = 
			new ASN1("ecParameters", ASN1.SEQUENCE,
				new ASN1("version", ASN1.INTEGER, new ByteString("01", HEX)),
				new ASN1("fieldID", ASN1.SEQUENCE,
					new ASN1("fieldType", ASN1.OBJECT_IDENTIFIER, new ByteString("prime-field", OID)),
					new ASN1("prime", ASN1.INTEGER, 
						PKIXCommon.convertUnsignedInteger(publicKey.getComponent(Key.ECC_P)))
				),
				new ASN1("curve", ASN1.SEQUENCE,
					new ASN1("a", ASN1.OCTET_STRING, 
						PKIXCommon.convertUnsignedInteger(publicKey.getComponent(Key.ECC_A))),
					new ASN1("b", ASN1.OCTET_STRING, 
						PKIXCommon.convertUnsignedInteger(publicKey.getComponent(Key.ECC_B)))
				),
				new ASN1("base", ASN1.OCTET_STRING,
						(new ByteString("04", HEX)).concat(publicKey.getComponent(Key.ECC_GX)).concat(publicKey.getComponent(Key.ECC_GY))),
				new ASN1("order", ASN1.INTEGER,
					PKIXCommon.convertUnsignedInteger(publicKey.getComponent(Key.ECC_N)))
			);
		
		var cofactor = publicKey.getComponent(Key.ECC_H);
		var i = 0;
		for (; (i < cofactor.length) && (cofactor.byteAt(i) == 0); i++);
		if (i < cofactor.length) {
			ecParameter.add(new ASN1("cofactor", ASN1.INTEGER, cofactor.bytes(i)));
		}
		algorithm.add(ecParameter);	
	} else {
		algorithm.add(new ASN1("parameters", ASN1.OBJECT_IDENTIFIER, publicKey.getComponent(Key.ECC_CURVE_OID)));
	}
	
	t.add(algorithm);
	
	// Prefix a 00 to form correct bitstring
	// Prefix a 04 to indicate uncompressed format
	var keybin = new ByteString("0004", HEX);
	keybin = keybin.concat(publicKey.getComponent(Key.ECC_QX));
	keybin = keybin.concat(publicKey.getComponent(Key.ECC_QY));
	t.add(new ASN1("subjectPublicKey", ASN1.BIT_STRING, keybin));

	return t;
}



/**
 * Creates the RSA Public Key as subjectPublicKeyInfo TLV structure object.
 *
 * <p>The structure is defined as:</p>
 * <pre>
 *	SubjectPublicKeyInfo  ::=  SEQUENCE  {
 *		algorithm            AlgorithmIdentifier,
 *		subjectPublicKey     BIT STRING  }
 *
 *	AlgorithmIdentifier  ::=  SEQUENCE  {
 *		algorithm               OBJECT IDENTIFIER,
 *		parameters              ANY DEFINED BY algorithm OPTIONAL  }
 * 
 *	pkcs-1 OBJECT IDENTIFIER ::= { iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) 1 }
 *
 *	rsaEncryption OBJECT IDENTIFIER ::=  { pkcs-1 1}
 *
 *	RSAPublicKey ::= SEQUENCE {
 *		modulus            INTEGER,    -- n
 *		publicExponent     INTEGER  }  -- e
 * </pre>
 *
 * @return the subjectPublicKey TLV structure
 * @type ASN1
 */
PKIXCommon.createRSASubjectPublicKeyInfo = function(publicKey) {
	var t = new ASN1("subjectPublicKeyInfo", ASN1.SEQUENCE);
	
	t.add(new ASN1("algorithm", ASN1.SEQUENCE,
		new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.113549.1.1.1", OID)),
		new ASN1("parameters", ASN1.NULL, new ByteString("", HEX))
	       ));
	// Prefix a 00 to form correct bitstring
	var keybin = new ByteString("00", HEX);

	var modulus = publicKey.getComponent(Key.MODULUS);
	modulus = PKIXCommon.convertUnsignedInteger(modulus);
	
	var exponent = publicKey.getComponent(Key.EXPONENT);
	exponent = PKIXCommon.convertUnsignedInteger(exponent);

	var rsapub = new ASN1("RSAPublicKey", ASN1.SEQUENCE,
			new ASN1("modulus", ASN1.INTEGER, modulus),
			new ASN1("publicKeyExponent", ASN1.INTEGER, exponent));

	keybin = keybin.concat(rsapub.getBytes());
	t.add(new ASN1("subjectPublicKey", ASN1.BIT_STRING, keybin));

	return t;
}



/**
 * Creates a relative distinguished name component.
 *
 * <p>The structure is defined as:</p>
 * <pre>
 *	RelativeDistinguishedName ::=
 *		SET SIZE (1..MAX) OF AttributeTypeAndValue
 *
 *	AttributeTypeAndValue ::= SEQUENCE {
 *		type     AttributeType,
 *		value    AttributeValue }
 *
 *	AttributeType ::= OBJECT IDENTIFIER
 *
 *	AttributeValue ::= ANY -- DEFINED BY AttributeType
 *
 *	DirectoryString ::= CHOICE {
 *		teletexString           TeletexString (SIZE (1..MAX)),
 *		printableString         PrintableString (SIZE (1..MAX)),
 *		universalString         UniversalString (SIZE (1..MAX)),
 *		utf8String              UTF8String (SIZE (1..MAX)),
 *		bmpString               BMPString (SIZE (1..MAX)) }
 *</pre>
 *
 * @param {String} name the components name
 * @param {String} oid the oid for the RDN
 * @param {ASN1} value the value object
 * @return the 
 */
PKIXCommon.makeRDN = function(name, oid, value) {
	return new ASN1(name, ASN1.SET,
				new ASN1(ASN1.SEQUENCE,
					new ASN1(ASN1.OBJECT_IDENTIFIER, new ByteString(oid, OID)),
					value
				)
			);
}



/**
 * Adds names from the name object to the RDNSequence.
 *
 * @param {ASN1} t the sequence object
 * @param {Object} name the name object
 */
PKIXCommon.addNames = function(t, name) {
	if (name.C) {
		t.add(PKIXCommon.makeRDN("country", "id-at-countryName", new ASN1(ASN1.PrintableString, new ByteString(name.C, ASCII))));
	}
	if (name.O) {
		t.add(PKIXCommon.makeRDN("organization", "id-at-organizationName", new ASN1(ASN1.UTF8String, new ByteString(name.O, UTF8))));
	}
	if (name.OU) {
		t.add(PKIXCommon.makeRDN("organizationalUnit", "id-at-organizationalUnitName", new ASN1(ASN1.UTF8String, new ByteString(name.OU, UTF8))));
	}
	if (name.S) {
		t.add(PKIXCommon.makeRDN("stateOrProvince", "id-at-stateOrProvinceName", new ASN1(ASN1.UTF8String, new ByteString(name.S, UTF8))));
	}
	if (name.L) {
		t.add(PKIXCommon.makeRDN("locality", "id-at-localityName", new ASN1(ASN1.UTF8String, new ByteString(name.L, UTF8))));
	}
	if (name.DC) {
		t.add(PKIXCommon.makeRDN("domainComponent", "id-domainComponent", new ASN1(ASN1.UTF8String, new ByteString(name.DC, UTF8))));
	}
	if (name.T) {
		t.add(PKIXCommon.makeRDN("title", "id-at-title", new ASN1(ASN1.UTF8String, new ByteString(name.T, UTF8))));
	}
	if (name.G) {
		t.add(PKIXCommon.makeRDN("givenName", "id-at-givenName", new ASN1(ASN1.UTF8String, new ByteString(name.G, UTF8))));
	}
	if (name.SN) {
		t.add(PKIXCommon.makeRDN("surname", "id-at-surname", new ASN1(ASN1.UTF8String, new ByteString(name.SN, UTF8))));
	}
	if (name.CN) {
		t.add(PKIXCommon.makeRDN("commonName", "id-at-commonName", new ASN1(ASN1.UTF8String, new ByteString(name.CN, UTF8))));
	}
	if (name.SERIALNUMBER) {
		t.add(PKIXCommon.makeRDN("serialNumber", "id-at-serialNumber", new ASN1(ASN1.UTF8String, new ByteString(name.SERIALNUMBER, UTF8))));
	}
	if (name.DNQ) {
		t.add(PKIXCommon.makeRDN("dnQualifier", "id-at-dnQualifier", new ASN1(ASN1.UTF8String, new ByteString(name.DNQ, UTF8))));
	}
	if (name.E) {
		t.add(PKIXCommon.makeRDN("emailAddress", "id-emailAddress", new ASN1(ASN1.IA5String, new ByteString(name.E, ASCII))));
	}
	if (name.UID) {
		t.add(PKIXCommon.makeRDN("userId", "id-userId", new ASN1(ASN1.UTF8String, new ByteString(name.UID, UTF8))));
	}
}



/**
 * Gets the dn as TLV object
 *
 * <p>This function support two format for names</p>
 * <pre>
 *  var issuer = { C:"UT", O:"ACME Corporation", CN:"Test-CA" };
 * or
 *  var issuer = [ { C:"UT"}, { O:"ACME Corporation" }, { CN:"Test-CA"} ];
 * </pre>
 *
 * <p>It supports the following RDNs:</p>
 * <ul>
 * <li>C - country</li>
 * <li>O - organization</li>
 * <li>OU - organizational unit</li>
 * <li>S - state or province</li>
 * <li>L - locality</li>
 * <li>T - title</li>
 * <li>G - given name</li>
 * <li>SN - surname</li>
 * <li>CN - common name</li>
 * <li>SERIALNUMBER - serial number</li>
 * <p>The first format sorts the RDS in the sequence C,O,OU,S,L,T,G,SN,CN,SERIALNUMBER</p>
 * </ul>
 * @param {Object} name the name object
 * @return the RDNSequence
 * @type ASN1
 */
PKIXCommon.encodeName = function(name) {
	var t = new ASN1("subject", ASN1.SEQUENCE);
	if (typeof(name.C) == "undefined") {
		for (var i = 0; i < name.length; i++) {
			PKIXCommon.addNames(t, name[i]);
		}
	} else {
		PKIXCommon.addNames(t, name);
	}
	return t;
}



/**
 * Writes a byte string object to file
 *
 * <p>The filename is mapped to the workspace location.</p>
 *
 * @param {String} filename the fully qualified name of the file
 * @param {ByteString} content the content to write
 */
PKIXCommon.writeFileToDisk = function(filename, content) {
	var file = new java.io.FileOutputStream(filename);
	file.write(content);
	file.close();
}



/**
 * Loads a binary file from disk
 *
 * @param {String} filename the fully qualified file name
 * @return the binary content
 * @type ByteString
 */
PKIXCommon.readFileFromDisk = function(filename) {
	// Open stream
	var f = new java.io.FileInputStream(filename);
	
	// Determine file size
	var flen = f.available();

	// Allocate native byte array
	var bs = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, flen);
	
	// Read into byte array
	var len = f.read(bs);

	f.close();
	
	// Allocate JavaScript ByteBuffer from native/wrapped byte array
	var bb = new ByteBuffer(bs);
	
	// Convert to JavaScript ByteString
	var data = bb.toByteString();

	return data;
}



PKIXCommon.test = function() {
	var issuer = { C:"C", O:"O", OU:"OU", SP:"SP", L:"L", DC:"DC", T:"T", G:"G", SN:"SN", CN:"CN", SERIALNUMBER:"serial", DNQ:"DNQ" };
	var dn = PKIXCommon.encodeName(issuer);
	print(dn);
	
	var r = PKIXCommon.convertUnsignedInteger(new ByteString("00", HEX));
	assert(r.toString(HEX) == "00");
	var r = PKIXCommon.convertUnsignedInteger(new ByteString("80", HEX));
	assert(r.toString(HEX) == "0080");
	var r = PKIXCommon.convertUnsignedInteger(new ByteString("FF", HEX));
	assert(r.toString(HEX) == "00FF");
	var r = PKIXCommon.convertUnsignedInteger(new ByteString("0000", HEX));
	assert(r.toString(HEX) == "00");
	var r = PKIXCommon.convertUnsignedInteger(new ByteString("0080", HEX));
	assert(r.toString(HEX) == "0080");
	var r = PKIXCommon.convertUnsignedInteger(new ByteString("000080", HEX));
	assert(r.toString(HEX) == "0080");

}
