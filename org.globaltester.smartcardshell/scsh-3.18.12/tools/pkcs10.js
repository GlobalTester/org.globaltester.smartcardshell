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
 * @fileoverview A PKCS#10 generator class based on RFC5280
 */

load("pkixcommon.js");


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
 * @see PKIXCommon.encodeName()
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
	var t = new ASN1(ASN1.BIT_STRING, PKIXCommon.bitstringForInteger(flags));
	this.addExtension("2.5.29.15", t.getBytes());
}

// Deprecated: Use PKIXCommon. instead
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
 * Gets the subject name as TLV object
 *
 * @return the issuer RDNSequence
 * @type ASN1
 */
PKCS10Generator.prototype.getSubject = function() {
	return PKIXCommon.encodeName(this.subject);
}



/**
 * Gets the subject's public key as TLV object
 *
 * @return the subject's public key info
 * @type ASN1
 */
PKCS10Generator.prototype.getSubjectPublicKeyInfo = function() {
	if (this.publicKey.getComponent(Key.MODULUS)) {
		return PKIXCommon.createRSASubjectPublicKeyInfo(this.publicKey);
	} else {
		return PKIXCommon.createECSubjectPublicKeyInfo(this.publicKey, this.encodeECDomainParameter);
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

	x.addKeyUsageExtension(	PKIXCommon.digitalSignature |
							PKIXCommon.keyCertSign |
							PKIXCommon.cRLSign );

	var req = x.generateCertificationRequest(reqPrivateKey);
	var fn = GPSystem.mapFilename("cert.csr", GPSystem.USR);
	PKIXCommon.writeFileToDisk(fn, req.getBytes());

	print(req);
	
	return req;
}
