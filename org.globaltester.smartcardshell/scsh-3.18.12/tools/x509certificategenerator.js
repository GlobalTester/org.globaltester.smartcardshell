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
 * @fileoverview A X509 certificate generator class following RFC5280
 */

if (typeof(__ScriptingServer) == "undefined") {
	load("pkixcommon.js");
}

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
 * @param {String or Date} date the date in format YYMMDDHHMMSSZ
 */
X509CertificateGenerator.prototype.setNotBefore = function(date) {
	this.notBefore = date;
}



/**
 * Sets the expiration date for the certificate.
 *
 * @param {String or Date} date the date in format YYMMDDHHMMSSZ
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
 * Adds the key usage extension.
 *
 * <p>The following flags are defined:</p>
 * <pre>
 * PKIXCommon.digitalSignature = 0x0080;
 * PKIXCommon.nonRepudiation   = 0x0040;
 * PKIXCommon.keyEncipherment  = 0x0020;
 * PKIXCommon.dataEncipherment = 0x0010;
 * PKIXCommon.keyAgreement     = 0x0008;
 * PKIXCommon.keyCertSign      = 0x0004;
 * PKIXCommon.cRLSign          = 0x0002;
 * PKIXCommon.encipherOnly     = 0x0001;
 * PKIXCommon.decipherOnly     = 0x8000;
 * </pre>
 * @param {Number} the key usage flags as combination of the flags defined above.
 */
X509CertificateGenerator.prototype.addKeyUsageExtension = function(flags) {
	var t = new ASN1(ASN1.BIT_STRING, PKIXCommon.bitstringForInteger(flags));
	this.addExtension("2.5.29.15", true, t.getBytes());
}

// Deprecated: Use PKIXCommon. instead
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
	var crypto = new Crypto();
	var hash = crypto.digest(Crypto.SHA_1, keyvalue);
	
	var t = new ASN1(ASN1.OCTET_STRING, hash);
	this.addExtension("2.5.29.14", false, t.getBytes());
}



/**
 * Adds the authority public key identifier extension based on the issuers key.
 *
 * <p>The key identifier is calculated as SHA-1 hash over the contents of the
 * issuer public key (Without tag, length and number of unused bits.</p>
 *
 * @param {Key} publicKey the authority subject key
 */
X509CertificateGenerator.prototype.addAuthorityKeyIdentifierExtension = function(publicKey) {
	if (publicKey.getComponent(Key.MODULUS)) {
		var spi = PKIXCommon.createRSASubjectPublicKeyInfo(publicKey);
	} else {
		var spi = PKIXCommon.createECSubjectPublicKeyInfo(publicKey, this.encodeECDomainParameter);
	}

	var keyvalue = spi.get(1).value.bytes(1);
	var crypto = new Crypto();
	var hash = crypto.digest(Crypto.SHA_1, keyvalue);
	
	var t = new ASN1(ASN1.SEQUENCE,
					new ASN1(0x80, hash)
				);
	this.addExtension("2.5.29.35", false, t.getBytes());
}



/**
 * Adds the CRL distribution point URLs.
 *
 * @param {String[]} url a list of URLs
 */
X509CertificateGenerator.prototype.addCRLDistributionPointURL = function(url) {
	var t = new ASN1("cRLDistributionPoints", ASN1.SEQUENCE);

	for (var i = 0; i < url.length; i++) {
		t.add(	new ASN1("cRLDistributionPoint", ASN1.SEQUENCE,
					new ASN1("distributionPoint", 0xA0,
						new ASN1("fullName", 0xA0,
							new ASN1("uniformResourceIdentifier", 0x86, new ByteString(url[i], ASCII))
						)
					)
				));
	}
	this.addExtension("id-ce-cRLDistributionPoints", false, t.getBytes());
}



/**
 * Adds the extended key usage extension
 *
 * @param {String[]} oids the list of object identifier names
 * @param {Boolean} critical the extension is critical
 */
X509CertificateGenerator.prototype.addExtendedKeyUsages = function(oids, critical) {
	var t = new ASN1("extKeyUsages", ASN1.SEQUENCE);

	for (var i = 0; i < oids.length; i++) {
		t.add( new ASN1("keyPurposeId", ASN1.OBJECT_IDENTIFIER, new ByteString(oids[i], OID) ));
	}
	this.addExtension("id-ce-extKeyUsage", critical, t.getBytes());
}



/**
 * Gets the issuer name as TLV object
 *
 * @return the issuer RDNSequence
 * @type ASN1
 */
X509CertificateGenerator.prototype.getIssuer = function() {
	if (this.issuer instanceof ASN1) {
		return this.issuer;
	} else {
		return PKIXCommon.encodeName(this.issuer);
	}
}



/**
 * Gets the certificate validity as TLV object
 *
 * @return the certificates validity
 * @type ASN1
 */
X509CertificateGenerator.prototype.getValidity = function() {
	var t = new ASN1("validity", ASN1.SEQUENCE);

	var ts = this.notBefore;
	if (typeof(ts) != "string") {
		ts = PKIXCommon.dtoUTC(this.notBefore);
	}
	t.add(new ASN1("notBefore", ASN1.UTCTime, new ByteString(ts, ASCII)));
	
	var ts = this.notAfter;
	if (typeof(ts) != "string") {
		ts = PKIXCommon.dtoUTC(this.notAfter);
	}
	t.add(new ASN1("notAfter", ASN1.UTCTime, new ByteString(ts, ASCII)));
	return t;
}



/**
 * Gets the subject name as TLV object
 *
 * @return the issuer RDNSequence
 * @type ASN1
 */
X509CertificateGenerator.prototype.getSubject = function() {
	if (this.subject instanceof ASN1) {
		return this.subject;
	} else {
		return PKIXCommon.encodeName(this.subject);
	}
}



/**
 * Gets the subject's public key as TLV object
 *
 * @return the subject's public key info
 * @type ASN1
 */
X509CertificateGenerator.prototype.getSubjectPublicKeyInfo = function() {
	if (this.publicKey.getComponent(Key.MODULUS)) {
		return PKIXCommon.createRSASubjectPublicKeyInfo(this.publicKey);
	} else {
		return PKIXCommon.createECSubjectPublicKeyInfo(this.publicKey, this.encodeECDomainParameter);
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
	t.add(new ASN1("serialNumber", ASN1.INTEGER, PKIXCommon.convertUnsignedInteger(this.serialNumber)));
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

	x.addKeyUsageExtension(	PKIXCommon.digitalSignature |
							PKIXCommon.keyCertSign |
							PKIXCommon.cRLSign );
							
	x.addBasicConstraintsExtension(true, 0);
	x.addSubjectKeyIdentifierExtension();
	x.addAuthorityKeyIdentifierExtension(caPublicKey);

	var cert = x.generateX509Certificate(caPrivateKey);
	var fn = GPSystem.mapFilename("cert_rsa.cer", GPSystem.USR);
	PKIXCommon.writeFileToDisk(fn, cert.getBytes());

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
	var t = new Date();
	x.setNotBefore(t);
	x.setNotAfter(PKIXCommon.addDays(t, 180));
	var subject = { C:"UT", O:"Utopia CA", OU:"ACME Corporation", CN:"Joe Doe" };
	x.setSubject(subject);

	x.setPublicKey(caPublicKey);

	x.addKeyUsageExtension(	PKIXCommon.digitalSignature |
							PKIXCommon.keyCertSign |
							PKIXCommon.cRLSign );
							
	x.addBasicConstraintsExtension(true, 0);
	x.addSubjectKeyIdentifierExtension();
	x.addAuthorityKeyIdentifierExtension(caPublicKey);

	var cert = x.generateX509Certificate(caPrivateKey);
	
	var fn = GPSystem.mapFilename("cert_ecc.cer", GPSystem.USR);
	PKIXCommon.writeFileToDisk(fn, cert.getBytes());

	cert.verifyWith(cert);
	
	print(cert);
	print(new ASN1(cert.getBytes()));
}

// X509CertificateGeneratorECCTest();
