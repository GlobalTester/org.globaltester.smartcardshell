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
 * Simple X509 generator class
 */



/**
 * Create a X.509 certificate generator.
 *
 * @class Class implementing a X.509 certificate generator
 * @constructor
 *
 * @param {Crypto} crypto the crypto provider to use for signing operations
 */
function X509CertificateGenerator(crypto) {
	this.crypto = crypto;
	this.encodeECDomainParameter = true;
	this.reset();
}



/**
 * Resets all internal state variables.
 *
 */
X509CertificateGenerator.prototype.reset = function() {
	this.extensions = new Array();
	
}



/**
 * Sets the serial number.
 *
 * @param {ByteString} serialNumber the serial number for the certificate
 */
X509CertificateGenerator.prototype.setSerialNumber = function(serialNumber) {
	this.serialNumber = serialNumber;
}



/**
 * Sets the isser name.
 *
 * <p>The issuer name must be a JavaScript object containing the properties:</p>
 * <ul>
 *  <li>C - the country</li>
 *  <li>O - the organization</li>
 *  <li>OU - the organization unit</li>
 *  <li>CN - the common name</li>
 * </ul>
 * <p>Example:</p>
 * <pre>
 *	var issuer = { C:"UT", O:"ACME Corporation", CN:"Test-CA" };
 * </pre>
 * @param {Object} issuer the issuer name
 */
X509CertificateGenerator.prototype.setIssuer = function(issuer) {
	this.issuer = issuer;
}



/**
 * Sets the effective date for the certificate.
 *
 * @param {String} date the date in format YYMMDDHHMMSSZ
 */
X509CertificateGenerator.prototype.setNotBefore = function(date) {
	this.notBefore = date;
}



/**
 * Sets the expiration date for the certificate.
 *
 * @param {String} date the date in format YYMMDDHHMMSSZ
 */
X509CertificateGenerator.prototype.setNotAfter = function(date) {
	this.notAfter = date;
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
X509CertificateGenerator.prototype.setSubject = function(subject) {
	this.subject = subject;
}



/**
 * Sets the subjects public key
 *
 * <p>The methods accepts ECC and RSA Public Keys.</p>
 *
 * @param {Key} publicKey the subjects public key
 */
X509CertificateGenerator.prototype.setPublicKey = function(publicKey) {
	this.publicKey = publicKey;
}



/**
 * Sets the signature algorithm. Currently only Crypto.RSA is supported
 *
 * @param {Number} alg the signature algorithm, only Crypto.RSA supported
 */
X509CertificateGenerator.prototype.setSignatureAlgorithm = function(alg) {
	this.signatureAlgorithm = alg;
}



/**
 * Adds an extension to the certificate
 *
 * <p>The structure is defined as:</p>
 * <pre>
 *    Extension  ::=  SEQUENCE  {
 *        extnID      OBJECT IDENTIFIER,
 *        critical    BOOLEAN DEFAULT FALSE,
 *        extnValue   OCTET STRING
 *                    -- contains the DER encoding of an ASN.1 value
 *                    -- corresponding to the extension type identified
 *                    -- by extnID
 *        }
 *</pre>
 * @param {String} extnID the extensions object identifier
 * @param {Boolean} critical the extension is critical
 * @param {ByteString} the extension value as ByteString
 */
X509CertificateGenerator.prototype.addExtension = function(extnID, critical, extnValue) {
	var t = new ASN1("extension", ASN1.SEQUENCE,
				new ASN1("extnID", ASN1.OBJECT_IDENTIFIER, new ByteString(extnID, OID))
			);

	if (critical) {
		t.add(new ASN1("critical", ASN1.BOOLEAN, new ByteString("FF", HEX)));
	}

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
X509CertificateGenerator.bitstringForInteger = function(val) {
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
 * X509CertificateGenerator.digitalSignature = 0x0080;
 * X509CertificateGenerator.nonRepudiation   = 0x0040;
 * X509CertificateGenerator.keyEncipherment  = 0x0020;
 * X509CertificateGenerator.dataEncipherment = 0x0010;
 * X509CertificateGenerator.keyAgreement     = 0x0008;
 * X509CertificateGenerator.keyCertSign      = 0x0004;
 * X509CertificateGenerator.cRLSign          = 0x0002;
 * X509CertificateGenerator.encipherOnly     = 0x0001;
 * X509CertificateGenerator.decipherOnly     = 0x8000;
 * </pre>
 * @param {Number} the key usage flags as combination of the flags defined above.
 */
X509CertificateGenerator.prototype.addKeyUsageExtension = function(flags) {
	var t = new ASN1(ASN1.BIT_STRING, X509CertificateGenerator.bitstringForInteger(flags));
	this.addExtension("2.5.29.15", true, t.getBytes());
}

X509CertificateGenerator.digitalSignature	= 0x0080;
X509CertificateGenerator.nonRepudiation		= 0x0040;
X509CertificateGenerator.keyEncipherment	= 0x0020;
X509CertificateGenerator.dataEncipherment	= 0x0010;
X509CertificateGenerator.keyAgreement		= 0x0008;
X509CertificateGenerator.keyCertSign		= 0x0004;
X509CertificateGenerator.cRLSign			= 0x0002;
X509CertificateGenerator.encipherOnly		= 0x0001;
X509CertificateGenerator.decipherOnly		= 0x8000;



/**
 * Adds the BasicConstraints extension.
 *
 * @param {Boolean} cA the certificate belongs to a CA
 * @param {Number} pathLenConstraint the maximum number of subordinate CA certificates
 */
X509CertificateGenerator.prototype.addBasicConstraintsExtension = function(cA, pathLenConstraint) {
	var t = new ASN1("BasicConstraints",ASN1.SEQUENCE);
	if (cA) {
		t.add(new ASN1("cA", ASN1.BOOLEAN, new ByteString("FF", HEX)));
	}
	if (pathLenConstraint >= 0) {
		var bb = new ByteBuffer();
		bb.append(pathLenConstraint);
		t.add(new ASN1("pathLenConstraint", ASN1.INTEGER, bb.toByteString()));
	}
	this.addExtension("2.5.29.19", true, t.getBytes());
}



/**
 * Adds the subject public key identifier extension based on the certificates subject key.
 *
 * <p>The key identifier is calculated as SHA-1 hash over the contents of the
 * subject public key (Without tag, length and number of unused bits.</p>
 */
X509CertificateGenerator.prototype.addSubjectKeyIdentifierExtension = function() {
	var spi = this.getSubjectPublicKeyInfo();
	var keyvalue = spi.get(1).value.bytes(1);
	var hash = this.crypto.digest(Crypto.SHA_1, keyvalue);
	
	var t = new ASN1(ASN1.OCTET_STRING, hash);
	this.addExtension("2.5.29.14", false, t.getBytes());
}



/**
 * Adds the authority public key identifier extension based on the issuers key.
 *
 * <p>The key identifier is calculated as SHA-1 hash over the contents of the
 * issuer public key (Without tag, length and number of unused bits.</p>
 */
X509CertificateGenerator.prototype.addAuthorityKeyIdentifierExtension = function(publicKey) {
	if (publicKey.getComponent(Key.MODULUS)) {
		var spi = X509CertificateGenerator.createRSASubjectPublicKeyInfo(publicKey);
	} else {
		var spi = X509CertificateGenerator.createECSubjectPublicKeyInfo(publicKey, this.encodeECDomainParameter);
	}

	var keyvalue = spi.get(1).value.bytes(1);
	var hash = this.crypto.digest(Crypto.SHA_1, keyvalue);
	
	var t = new ASN1(ASN1.SEQUENCE,
					new ASN1(0x80, hash)
				);
	this.addExtension("2.5.29.35", false, t.getBytes());
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
X509CertificateGenerator.makeRDN = function(name, oid, value) {
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
X509CertificateGenerator.addNames = function(t, name) {
	if (name.T) {
		t.add(X509CertificateGenerator.makeRDN("title", "2.5.4.12", new ASN1(ASN1.UTF8String, new ByteString(name.T, UTF8))));
	}
	if (name.G) {
		t.add(X509CertificateGenerator.makeRDN("givenName", "2.5.4.42", new ASN1(ASN1.UTF8String, new ByteString(name.G, UTF8))));
	}
	if (name.SN) {
		t.add(X509CertificateGenerator.makeRDN("surname", "2.5.4.4", new ASN1(ASN1.UTF8String, new ByteString(name.SN, UTF8))));
	}
	if (name.CN) {
		t.add(X509CertificateGenerator.makeRDN("commonName", "2.5.4.3", new ASN1(ASN1.UTF8String, new ByteString(name.CN, UTF8))));
	}
	if (name.OU) {
		t.add(X509CertificateGenerator.makeRDN("organizationalUnit", "2.5.4.11", new ASN1(ASN1.UTF8String, new ByteString(name.OU, UTF8))));
	}
	if (name.O) {
		t.add(X509CertificateGenerator.makeRDN("organization", "2.5.4.10", new ASN1(ASN1.UTF8String, new ByteString(name.O, UTF8))));
	}
	if (name.C) {
		t.add(X509CertificateGenerator.makeRDN("country", "2.5.4.6", new ASN1(ASN1.PrintableString, new ByteString(name.C, ASCII))));
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
 * Gets the issuer name as TLV object
 *
 * @return the issuer RDNSequence
 * @type ASN1
 */
X509CertificateGenerator.prototype.getIssuer = function() {
	var t = new ASN1("issuer", ASN1.SEQUENCE);
	X509CertificateGenerator.addNames(t, this.issuer);
	return t;
}



/**
 * Gets the certificate validity as TLV object
 *
 * @return the certificates validity
 * @type ASN1
 */
X509CertificateGenerator.prototype.getValidity = function() {
	var t = new ASN1("validity", ASN1.SEQUENCE);
	t.add(new ASN1("notBefore", ASN1.UTCTime, new ByteString(this.notBefore, ASCII)));
	t.add(new ASN1("notAfter", ASN1.UTCTime, new ByteString(this.notAfter, ASCII)));
	return t;
}



/**
 * Gets the subject name as TLV object
 *
 * @return the issuer RDNSequence
 * @type ASN1
 */
X509CertificateGenerator.prototype.getSubject = function() {
	var t = new ASN1("subject", ASN1.SEQUENCE);
	X509CertificateGenerator.addNames(t, this.subject);
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
X509CertificateGenerator.convertUnsignedInteger = function(value) {
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
X509CertificateGenerator.createECSubjectPublicKeyInfo = function(publicKey, encodeECDomainParameter) {
	var t = new ASN1("subjectPublicKeyInfo", ASN1.SEQUENCE);

	var algorithm = new ASN1("algorithm", ASN1.SEQUENCE,
			new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.10045.2.1", OID))
		);

	if (encodeECDomainParameter) {
		var ecParameter = 
			new ASN1("ecParameters", ASN1.SEQUENCE,
				new ASN1("version", ASN1.INTEGER, new ByteString("01", HEX)),
				new ASN1("fieldID", ASN1.SEQUENCE,
					new ASN1("fieldType", ASN1.OBJECT_IDENTIFIER, new ByteString("prime-field", OID)),
					new ASN1("prime", ASN1.INTEGER, 
						X509CertificateGenerator.convertUnsignedInteger(publicKey.getComponent(Key.ECC_P)))
				),
				new ASN1("curve", ASN1.SEQUENCE,
					new ASN1("a", ASN1.OCTET_STRING, 
						X509CertificateGenerator.convertUnsignedInteger(publicKey.getComponent(Key.ECC_A))),
					new ASN1("a", ASN1.OCTET_STRING, 
						X509CertificateGenerator.convertUnsignedInteger(publicKey.getComponent(Key.ECC_B)))
				),
				new ASN1("base", ASN1.OCTET_STRING,
						(new ByteString("04", HEX)).concat(publicKey.getComponent(Key.ECC_GX)).concat(publicKey.getComponent(Key.ECC_GY))),
				new ASN1("order", ASN1.INTEGER,
					X509CertificateGenerator.convertUnsignedInteger(publicKey.getComponent(Key.ECC_N)))
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
X509CertificateGenerator.createRSASubjectPublicKeyInfo = function(publicKey) {
	var t = new ASN1("subjectPublicKeyInfo", ASN1.SEQUENCE);
	
	t.add(new ASN1("algorithm", ASN1.SEQUENCE,
		new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.113549.1.1.1", OID)),
		new ASN1("parameters", ASN1.NULL, new ByteString("", HEX))
	       ));
	// Prefix a 00 to form correct bitstring
	var keybin = new ByteString("00", HEX);

	var modulus = publicKey.getComponent(Key.MODULUS);
	modulus = X509CertificateGenerator.convertUnsignedInteger(modulus);
	
	var exponent = publicKey.getComponent(Key.EXPONENT);
	exponent = X509CertificateGenerator.convertUnsignedInteger(exponent);

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
X509CertificateGenerator.prototype.getSubjectPublicKeyInfo = function() {
	if (this.publicKey.getComponent(Key.MODULUS)) {
		return X509CertificateGenerator.createRSASubjectPublicKeyInfo(this.publicKey);
	} else {
		return X509CertificateGenerator.createECSubjectPublicKeyInfo(this.publicKey, this.encodeECDomainParameter);
	}
}



/**
 * Gets the certificate extension as TLV object
 *
 * @return the certificate extensions
 * @type ASN1
 */
X509CertificateGenerator.prototype.getExtensions = function() {
	var t = new ASN1("extensions", 0xA3);
	var s = new ASN1("extensions", ASN1.SEQUENCE);
	
	t.add(s);
	
	for (var i = 0; i < this.extensions.length; i++) {
		s.add(this.extensions[i]);
	}
	return t;
}



/**
 * Gets the part of the certificate that will be signed
 *
 * @return the TBSCertificate part
 * @type ASN1
 */
X509CertificateGenerator.prototype.getTbsCertificate = function() {
	var t = new ASN1("tbsCertificate", ASN1.SEQUENCE);
	t.add(new ASN1("version", 0xA0,
			new ASN1("version", ASN1.INTEGER, new ByteString("02", HEX))));
	t.add(new ASN1("serialNumber", ASN1.INTEGER, this.serialNumber));
	t.add(this.getSignatureAlgorithm());
	t.add(this.getIssuer());
	t.add(this.getValidity());
	t.add(this.getSubject());
	t.add(this.getSubjectPublicKeyInfo());
	t.add(this.getExtensions());
	return t;
}



/**
 * Gets the signature algorithm TLV object
 *
 * @return the signature algorithm object
 * @type ASN1
 */
X509CertificateGenerator.prototype.getSignatureAlgorithm = function() {
	var t = new ASN1("signatureAlgorithm", ASN1.SEQUENCE);

	if (this.signatureAlgorithm == Crypto.RSA) {
		t.add(new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.113549.1.1.5", OID)));
		t.add(new ASN1("parameters", ASN1.NULL, new ByteString("", HEX)));
	} else if (this.signatureAlgorithm == Crypto.RSA_SHA256) {
		t.add(new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("1.2.840.113549.1.1.11", OID)));
		t.add(new ASN1("parameters", ASN1.NULL, new ByteString("", HEX)));
	} else if (this.signatureAlgorithm == Crypto.ECDSA_SHA256) {
		t.add(new ASN1("algorithm", ASN1.OBJECT_IDENTIFIER, new ByteString("ecdsa-with-SHA256", OID)));
		t.add(new ASN1("parameters", ASN1.NULL, new ByteString("", HEX)));
	} else {
		throw new GPError("X509CertificateGenerator", GPError.INVALID_MECH, this.signatureAlgorithm, "Invalid algorithm");
	}
		
	return t;
}

 

/**
 * Generates the certificate.
 *
 * @return the generated certificate
 * @type X509
 */
X509CertificateGenerator.prototype.generateX509Certificate = function(privateKey) {
	var certificate = new ASN1("certificate", ASN1.SEQUENCE);
	
	var tbs = this.getTbsCertificate();
	certificate.add(tbs);
	certificate.add(this.getSignatureAlgorithm());
	
	var signature = this.crypto.sign(privateKey, this.signatureAlgorithm, tbs.getBytes());
	signature = (new ByteString("00", HEX)).concat(signature);

	var signatureValue = new ASN1("signatureValue", ASN1.BIT_STRING, signature);
	certificate.add(signatureValue);
	
//	print(certificate);
	return new X509(certificate.getBytes());
}



/**
 * Writes a byte string object to file
 *
 * <p>The filename is mapped to the workspace location.</p>
 *
 * @param {String} name the name of the file
 * @param {ByteString} content the content to write
 */
 
X509CertificateGenerator.writeFileToDisk = function(name, content) {

	// Map filename
	var filename = GPSystem.mapFilename(name, GPSystem.USR);
	print("Writing " + filename);

	var file = new java.io.FileOutputStream(filename);
	file.write(content);
	file.close();
}



function X509CertificateGeneratorRSATest() {

	var crypto = new Crypto();
	
	var caPrivateKey = new Key();
	caPrivateKey.setType(Key.PRIVATE);

	var caPublicKey = new Key();
	caPublicKey.setType(Key.PUBLIC);
	caPublicKey.setSize(1024);
	
	crypto.generateKeyPair(Crypto.RSA, caPublicKey, caPrivateKey);
	
//	var caPrivKey = new Key("profiles/kp_rsa_private.xml");

	var x = new X509CertificateGenerator(crypto);

	x.reset();
	x.setSerialNumber(new ByteString("01", HEX));
	x.setSignatureAlgorithm(Crypto.RSA);
	var issuer = { C:"UT", O:"ACME Corporation", CN:"Test-CA" };
	x.setIssuer(issuer);
	x.setNotBefore("060825120000Z");
	x.setNotAfter("160825120000Z");
	var subject = { C:"UT", O:"Utopia CA", OU:"ACME Corporation", CN:"Joe Doe" };
	x.setSubject(subject);

	x.setPublicKey(caPublicKey);

	x.addKeyUsageExtension(	X509CertificateGenerator.digitalSignature |
							X509CertificateGenerator.keyCertSign |
							X509CertificateGenerator.cRLSign );
							
	x.addBasicConstraintsExtension(true, 0);
	x.addSubjectKeyIdentifierExtension();
	x.addAuthorityKeyIdentifierExtension(caPublicKey);

	var cert = x.generateX509Certificate(caPrivateKey);
	X509CertificateGenerator.writeFileToDisk("cert_rsa.cer", cert.getBytes());

	cert.verifyWith(cert);

	print(cert);
}



function X509CertificateGeneratorECCTest() {

	var crypto = new Crypto();
	
	var caPrivateKey = new Key();
	caPrivateKey.setType(Key.PRIVATE);

	var caPublicKey = new Key();
	caPublicKey.setType(Key.PUBLIC);
	caPublicKey.setComponent(Key.ECC_CURVE_OID, new ByteString("brainpoolP256r1", OID));
	
	crypto.generateKeyPair(Crypto.EC, caPublicKey, caPrivateKey);

	var x = new X509CertificateGenerator(crypto);

	x.reset();
	x.setSerialNumber(new ByteString("01", HEX));
	x.setSignatureAlgorithm(Crypto.ECDSA_SHA256);
	var issuer = { C:"UT", O:"ACME Corporation", CN:"Test-CA" };
	x.setIssuer(issuer);
	x.setNotBefore("060825120000Z");
	x.setNotAfter("160825120000Z");
	var subject = { C:"UT", O:"Utopia CA", OU:"ACME Corporation", CN:"Joe Doe" };
	x.setSubject(subject);

	x.setPublicKey(caPublicKey);

	x.addKeyUsageExtension(	X509CertificateGenerator.digitalSignature |
							X509CertificateGenerator.keyCertSign |
							X509CertificateGenerator.cRLSign );
							
	x.addBasicConstraintsExtension(true, 0);
	x.addSubjectKeyIdentifierExtension();
	x.addAuthorityKeyIdentifierExtension(caPublicKey);

	var cert = x.generateX509Certificate(caPrivateKey);
	X509CertificateGenerator.writeFileToDisk("cert_ecc.cer", cert.getBytes());

	cert.verifyWith(cert);
	
	print(cert);
	print(new ASN1(cert.getBytes()));
}

X509CertificateGeneratorECCTest();
