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
 * @fileoverview
 * Simple PKCS#10 generator class
 */



/**
 * Create a PKCS#10 certificate request
 *
 * @class Class implementing a PKCS#10 certificate request
 * @constructor
 *
 * @param {Crypto} crypto the crypto provider to use for signing operations
 */
function PKCS10Generator(crypto) {
	this.crypto = crypto;
	this.reset();
}



/**
 * Resets all internal state variables.
 *
 */
PKCS10Generator.prototype.reset = function() {
	this.extensions = new Array();
	this.attributes = new Array();
}



/**
 * Sets the subject name.
 *
 * <p>The subject name must be a JavaScript object containing the properties:</p>
 * <ul>
 *  <li>C - the country</li>
 *  <li>O - the organization</li>
 *  <li>OU - the organization unit</li>
 *  <li>CN - the common name</li>
 * </ul>
 * <p>Example:</p>
 * <pre>
 *	var subject = { C:"UT", O:"ACME Corporation", CN:"Joe Doe" };
 * </pre>
 * @param {Object} subject the subject name
 */
PKCS10Generator.prototype.setSubject = function(subject) {
	this.subject = subject;
}



/**
 * Sets the subjects public key
 *
 * <p>The methods accepts ECC and RSA Public Keys.</p>
 *
 * @param {Key} publicKey the subjects public key
 */
PKCS10Generator.prototype.setPublicKey = function(publicKey) {
	this.publicKey = publicKey;
}



/**
 * Sets the signature algorithm. Currently only Crypto.RSA is supported
 *
 * @param {Number} alg the signature algorithm, only Crypto.RSA supported
 */
PKCS10Generator.prototype.setSignatureAlgorithm = function(alg) {
	this.signatureAlgorithm = alg;
}



/**
 * Adds an extension to the certificate
 *
 * <p>The structure is defined as:</p>
 * <pre>
 *    Extension  ::=  SEQUENCE  {
 *        extnID      OBJECT IDENTIFIER,
 *        extnValue   OCTET STRING
 *                    -- contains the DER encoding of an ASN.1 value
 *                    -- corresponding to the extension type identified
 *                    -- by extnID
 *        }
 *</pre>
 * @param {String} extnID the extensions object identifier
 * @param {ByteString} the extension value as ByteString
 */
PKCS10Generator.prototype.addExtension = function(extnID, extnValue) {
	var t = new ASN1("extension", ASN1.SEQUENCE,
				new ASN1("extnID", ASN1.OBJECT_IDENTIFIER, new ByteString(extnID, OID))
			);

	t.add(new ASN1("extnValue", ASN1.OCTET_STRING, extnValue));
	this.extensions.push(t);
}



/**
 * Converts the integer value into a BIT STRING value.
 * <p>The function interprets the integer value as bitmap, where
 * bit 0 is the most significant bit of the least significant byte.</p>
 * <p>The function adds the minimum number of bytes to the final bit string
 * and encodes the number of unused bits at the beginning.</p>
 * 
 * @param {Number} val the value to convert
 * @return the bit string
 * @type ByteString
 */
PKCS10Generator.bitstringForInteger = function(val) {
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
 * Adds the key usage extension.
 *
 * <p>The following flags are defined:</p>
 * <pre>
 * PKCS10Generator.digitalSignature = 0x0080;
 * PKCS10Generator.nonRepudiation   = 0x0040;
 * PKCS10Generator.keyEncipherment  = 0x0020;
 * PKCS10Generator.dataEncipherment = 0x0010;
 * PKCS10Generator.keyAgreement     = 0x0008;
 * PKCS10Generator.keyCertSign      = 0x0004;
 * PKCS10Generator.cRLSign          = 0x0002;
 * PKCS10Generator.encipherOnly     = 0x0001;
 * PKCS10Generator.decipherOnly     = 0x8000;
 * </pre>
 * @param {Number} the key usage flags as combination of the flags defined above.
 */
PKCS10Generator.prototype.addKeyUsageExtension = function(flags) {
	var t = new ASN1(ASN1.BIT_STRING, PKCS10Generator.bitstringForInteger(flags));
	this.addExtension("2.5.29.15", t.getBytes());
}

PKCS10Generator.digitalSignature	= 0x0080;
PKCS10Generator.nonRepudiation		= 0x0040;
PKCS10Generator.keyEncipherment		= 0x0020;
PKCS10Generator.dataEncipherment	= 0x0010;
PKCS10Generator.keyAgreement		= 0x0008;
PKCS10Generator.keyCertSign			= 0x0004;
PKCS10Generator.cRLSign				= 0x0002;
PKCS10Generator.encipherOnly		= 0x0001;
PKCS10Generator.decipherOnly		= 0x8000;



/**
 * Adds extended key usages
 *
 * @param {String[]} the list of extended key usage object identifier
 */
PKCS10Generator.prototype.addExtendedKeyUsageExtension = function(keyusages) {
	var t = new ASN1(ASN1.SEQUENCE);
	for (var i = 0; i < keyusages.length; i++) {
		t.add(new ASN1(ASN1.OBJECT_IDENTIFIER, new ByteString(keyusages[i], OID)));
	}
	this.addExtension("id-ce-extKeyUsage", t.getBytes());
}



/**
 * Adds the BasicConstraints extension.
 *
 * @param {Boolean} cA the certificate belongs to a CA
 * @param {Number} pathLenConstraint the maximum number of subordinate CA certificates
 */
PKCS10Generator.prototype.addBasicConstraintsExtension = function(cA, pathLenConstraint) {
	var t = new ASN1("BasicConstraints",ASN1.SEQUENCE);
	if (cA) {
		t.add(new ASN1("cA", ASN1.BOOLEAN, new ByteString("FF", HEX)));
	}
	if (pathLenConstraint >= 0) {
		var bb = new ByteBuffer();
		bb.append(pathLenConstraint);
		t.add(new ASN1("pathLenConstraint", ASN1.INTEGER, bb.toByteString()));
	}
	this.addExtension("2.5.29.19", t.getBytes());
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
PKCS10Generator.makeRDN = function(name, oid, value) {
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
PKCS10Generator.addNames = function(t, name) {
	if (name.T) {
		t.add(PKCS10Generator.makeRDN("title", "2.5.4.12", new ASN1(ASN1.UTF8String, new ByteString(name.T, UTF8))));
	}
	if (name.G) {
		t.add(PKCS10Generator.makeRDN("givenName", "2.5.4.42", new ASN1(ASN1.UTF8String, new ByteString(name.G, UTF8))));
	}
	if (name.SN) {
		t.add(PKCS10Generator.makeRDN("surname", "2.5.4.4", new ASN1(ASN1.UTF8String, new ByteString(name.SN, UTF8))));
	}
	if (name.CN) {
		t.add(PKCS10Generator.makeRDN("commonName", "2.5.4.3", new ASN1(ASN1.UTF8String, new ByteString(name.CN, UTF8))));
	}
	if (name.OU) {
		t.add(PKCS10Generator.makeRDN("organizationalUnit", "2.5.4.11", new ASN1(ASN1.UTF8String, new ByteString(name.OU, UTF8))));
	}
	if (name.O) {
		t.add(PKCS10Generator.makeRDN("organization", "2.5.4.10", new ASN1(ASN1.UTF8String, new ByteString(name.O, UTF8))));
	}
	if (name.C) {
		t.add(PKCS10Generator.makeRDN("country", "2.5.4.6", new ASN1(ASN1.PrintableString, new ByteString(name.C, ASCII))));
	}
/*	
X509Name.name = "550429";
X509Name.surname = "550404";
X509Name.givenname = "55042A";
X509Name.initials = "55042B";
X509Name.generationQualifier = "55042C";
X509Name.localityName = "550407";
X509Name.stateOrProvinceName = "550408";
X509Name.title = "55040C";
X509Name.dnQualifier = "55042C";
X509Name.serialNumber = "550405";
X509Name.emailAddress = "2A864886F70D010901";

X509Name.commonName = "550403";
X509Name.organizationalUnitName = "55040B";
X509Name.organizationName = "55040A";
X509Name.countryName = "550406";
*/
}



/**
 * Gets the subject name as TLV object
 *
 * @return the issuer RDNSequence
 * @type ASN1
 */
PKCS10Generator.prototype.getSubject = function() {
	var t = new ASN1("subject", ASN1.SEQUENCE);
	if (typeof(this.subject.C) == "undefined") {
		for (var i = 0; i < this.subject.length; i++) {
			PKCS10Generator.addNames(t, this.subject[i]);
		}
	} else {
		PKCS10Generator.addNames(t, this.subject);
	}
	return t;
}



/**
 * Prepends a '00' to ByteStrings which have the most significant bit set.
 *
 * This prevent interpretation of the integer representation if converted into
 * a signed ASN1 INTEGER.
 *
 * @param {ByteString} value the value to convert
 * @return the converted value
 * @type ByteString
 */
PKCS10Generator.convertUnsignedInteger = function(value) {
	if (value.byteAt(0) >= 0x80) {
		value = (new ByteString("00", HEX)).concat(value);
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
 * 
 * @return the subjectPublicKey TLV structure
 * @type ASN1
 */
PKCS10Generator.createECSubjectPublicKeyInfo = function(publicKey) {
	var t = new ASN1("subjectPublicKeyInfo", ASN1.SEQUENCE);

	t.add(new ASN1("algorithm", ASN1.SEQUENCE,
		new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.10045.2.1", OID)),
		new ASN1("parameters", ASN1.OBJECT_IDENTIFIER, publicKey.getComponent(Key.ECC_CURVE_OID))
	));

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
PKCS10Generator.createRSASubjectPublicKeyInfo = function(publicKey) {
	var t = new ASN1("subjectPublicKeyInfo", ASN1.SEQUENCE);
	
	t.add(new ASN1("algorithm", ASN1.SEQUENCE,
		new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.113549.1.1.1", OID)),
		new ASN1("parameters", ASN1.NULL, new ByteString("", HEX))
	       ));
	// Prefix a 00 to form correct bitstring
	var keybin = new ByteString("00", HEX);

	var modulus = publicKey.getComponent(Key.MODULUS);
	modulus = PKCS10Generator.convertUnsignedInteger(modulus);
	
	var exponent = publicKey.getComponent(Key.EXPONENT);
	exponent = PKCS10Generator.convertUnsignedInteger(exponent);

	var rsapub = new ASN1("RSAPublicKey", ASN1.SEQUENCE,
			new ASN1("modulus", ASN1.INTEGER, modulus),
			new ASN1("publicKeyExponent", ASN1.INTEGER, exponent));

	keybin = keybin.concat(rsapub.getBytes());
	t.add(new ASN1("subjectPublicKey", ASN1.BIT_STRING, keybin));

	return t;
}



/**
 * Gets the subject's public key as TLV object
 *
 * @return the subject's public key info
 * @type ASN1
 */
PKCS10Generator.prototype.getSubjectPublicKeyInfo = function() {
	if (this.publicKey.getComponent(Key.MODULUS)) {
		return PKCS10Generator.createRSASubjectPublicKeyInfo(this.publicKey);
	} else {
		return PKCS10Generator.createECSubjectPublicKeyInfo(this.publicKey);
	}
}



/**
 * Gets the extension attribute as TLV object
 *
 * @return the certificate extensions
 * @type ASN1
 */
PKCS10Generator.prototype.getExtensions = function() {
	var t = new ASN1("extensions", ASN1.SEQUENCE);
	t.add(new ASN1(ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.113549 1 9 14", OID)));
	var s = new ASN1("extensions", ASN1.SET);
	t.add(s);
	var l = new ASN1("extensions", ASN1.SEQUENCE);
	s.add(l);
	
	for (var i = 0; i < this.extensions.length; i++) {
		l.add(this.extensions[i]);
	}
	return t;
}



/**
 * Gets the attributes as TLV object
 *
 * @return the request attributes
 * @type ASN1
 */
PKCS10Generator.prototype.getAttributes = function() {
	var t = new ASN1("attributes", 0xA0);
	
	if (this.extensions.length > 0) {
		t.add(this.getExtensions());
	}
	
	for (var i = 0; i < this.attributes.length; i++) {
		t.add(this.attributes[i]);
	}
	
	return t;
}



/**
 * Gets the part of the request that will be signed
 *
 * @return the TBSCertificate part
 * @type ASN1
 */
PKCS10Generator.prototype.getTbsRequest = function() {
	var t = new ASN1("certificationRequestInfo", ASN1.SEQUENCE);
	t.add(new ASN1(ASN1.INTEGER, new ByteString("00", HEX)));
	t.add(this.getSubject());
	t.add(this.getSubjectPublicKeyInfo());
	t.add(this.getAttributes());
	return t;
}



/**
 * Gets the signature algorithm TLV object
 *
 * @return the signature algorithm object
 * @type ASN1
 */
PKCS10Generator.prototype.getSignatureAlgorithm = function() {
	var t = new ASN1("signatureAlgorithm", ASN1.SEQUENCE);

	if (this.signatureAlgorithm == Crypto.RSA) {
		t.add(new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.113549.1.1.5", OID)));
		t.add(new ASN1("parameters", ASN1.NULL, new ByteString("", HEX)));
	} else if (this.signatureAlgorithm == Crypto.RSA_SHA256) {
		t.add(new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1 2 840 113549 1 1 11", OID)));
		t.add(new ASN1("parameters", ASN1.NULL, new ByteString("", HEX)));
	} else {
		throw new GPError("PKCS10Generator", GPError.INVALID_MECH, this.signatureAlgorithm, "Invalid algorithm");
	}
		
	return t;
}



/**
 * Generates the certificate.
 *
 * @return the generated certificate
 * @type ASN1
 */
PKCS10Generator.prototype.generateCertificationRequest = function(privateKey) {
	var request = new ASN1("certificationRequest", ASN1.SEQUENCE);
	
	var tbs = this.getTbsRequest();
	request.add(tbs);
	request.add(this.getSignatureAlgorithm());
	
	var signature = this.crypto.sign(privateKey, this.signatureAlgorithm, tbs.getBytes());
	signature = (new ByteString("00", HEX)).concat(signature);

	var signatureValue = new ASN1("signatureValue", ASN1.BIT_STRING, signature);
	request.add(signatureValue);
	
	return request;
}



/**
 * Writes a byte string object to file
 *
 * <p>The filename is mapped to the workspace location.</p>
 *
 * @param {String} name the name of the file
 * @param {ByteString} content the content to write
 */
 
PKCS10Generator.writeFileToDisk = function(name, content) {

	// Map filename
	var filename = GPSystem.mapFilename(name, GPSystem.USR);
	print("Writing " + filename);

	var file = new java.io.FileOutputStream(filename);
	file.write(content);
	file.close();
}



function PKCS10GeneratorTest() {

	var crypto = new Crypto();
	
	var reqPrivateKey = new Key();
	reqPrivateKey.setType(Key.PRIVATE);

	var reqPublicKey = new Key();
	reqPublicKey.setType(Key.PUBLIC);
	reqPublicKey.setSize(1024);
	
	crypto.generateKeyPair(Crypto.RSA, reqPublicKey, reqPrivateKey);
	
	var x = new PKCS10Generator(crypto);

	x.reset();
	x.setSignatureAlgorithm(Crypto.RSA_SHA256);

	var subject = [{C:"UT"}, {O:"Utopia CA"}, {OU:"ACME Corporation"}, {CN:"Joe Doe"} ];
	
	x.setSubject(subject);

	x.setPublicKey(reqPublicKey);

	x.addKeyUsageExtension(	PKCS10Generator.digitalSignature |
							PKCS10Generator.keyCertSign |
							PKCS10Generator.cRLSign );

	var req = x.generateCertificationRequest(reqPrivateKey);
	PKCS10Generator.writeFileToDisk("cert.csr", req.getBytes());

	print(req);
	
	return req;
}
