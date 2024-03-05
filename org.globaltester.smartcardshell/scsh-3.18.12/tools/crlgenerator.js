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
 * Simple CRL generator class
 */

if (typeof(__ScriptingServer) == "undefined") {
	load("pkixcommon.js");
}

 

/**
 * Create a Certificate Revocation List (CRL) generator.
 *
 * @class Class implementing a CRL certificate generator
 * @constructor
 *
 * @param {Crypto} crypto the crypto provider to use for signing operations
 */
function CRLGenerator(crypto) {
	this.crypto = crypto;
	this.reset();
}


CRLGenerator.unspecified = 0;
CRLGenerator.keyCompromise = 1;
CRLGenerator.cACompromise = 2;
CRLGenerator.affiliationChanged = 3;
CRLGenerator.superseded = 4;
CRLGenerator.cessationOfOperation = 5;
CRLGenerator.certificateHold = 6;
CRLGenerator.removeFromCRL = 8;
CRLGenerator.privilegeWithdrawn = 9;
CRLGenerator.aACompromise = 10;



/**
 * Resets all internal state variables.
 *
 */
CRLGenerator.prototype.reset = function() {
	this.extensions = [];
	this.revokedCertificates = [];
	this.nextUpdate = null;
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
CRLGenerator.prototype.setIssuer = function(issuer) {
	this.issuer = issuer;
}



/**
 * Sets the timestamp for this CRL
 *
 * @param {Date} datetime the current date and time
 */
CRLGenerator.prototype.setThisUpdate = function(datetime) {
	this.thisUpdate = datetime;
}



/**
 * Sets the timestamp for the next update
 *
 * @param {Date} datetime the date and time of the next update
 */
CRLGenerator.prototype.setNextUpdate = function(datetime) {
	this.nextUpdate = datetime;
}



/**
 * Sets the signature algorithm.
 *
 * @param {Number} alg the signature algorithm, must be one of Crypto.RSA, Crypto.RSA_SHA256 or Crypto.ECDSA_SHA256
 */
CRLGenerator.prototype.setSignatureAlgorithm = function(alg) {
	this.signatureAlgorithm = alg;
}



/**
 * Adds an extension to the CRL
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
CRLGenerator.prototype.addExtension = function(extnID, critical, extnValue) {
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
 * Adds the authority public key identifier extension based on the issuers key.
 *
 * <p>The key identifier is calculated as SHA-1 hash over the contents of the
 * issuer public key (Without tag, length and number of unused bits.</p>
 */
CRLGenerator.prototype.addAuthorityKeyIdentifierExtension = function(publicKey) {
	if (publicKey.getComponent(Key.MODULUS)) {
		var spi = PKIXCommon.createRSASubjectPublicKeyInfo(publicKey);
	} else {
		var spi = PKIXCommon.createECSubjectPublicKeyInfo(publicKey, this.encodeECDomainParameter);
	}

	var keyvalue = spi.get(1).value.bytes(1);
	var hash = this.crypto.digest(Crypto.SHA_1, keyvalue);
	
	var t = new ASN1(ASN1.SEQUENCE,
					new ASN1(0x80, hash)
				);
	this.addExtension("id-ce-authorityKeyIdentifier", false, t.getBytes());
}



/**
 * Adds the CRL number extension.
 *
 */
CRLGenerator.prototype.addCRLNumberExtension = function(crlnumber) {
	var t = new ASN1(ASN1.INTEGER,
					PKIXCommon.convertUnsignedInteger(ByteString.valueOf(crlnumber))
				);
	this.addExtension("id-ce-cRLNumber", false, t.getBytes());
}



/**
 * Add a revoked certificate to the list. This adds the complete DER encoded structure.
 *
 * @param {ASN1} revokedCertificate the information related to the revoked certificate
 */
CRLGenerator.prototype.addRevokedCertificate = function(revokedCertificate) {
	this.revokedCertificates.push(revokedCertificate);
}



/**
 * Add a revoked certificate to the list. This adds the complete DER encoded structure.
 *
 * @param {ByteString} serial the serial number of the certificate to revoke
 * @param {Date} timestamp the revocation time, optional, default is now
 * @param {Number) reason the revocation reason
 * @param {ASN1) ext the crl entry extensions
 */
CRLGenerator.prototype.revokeCertificate = function(serial, timestamp, reason, ext) {
	if (typeof(timestamp) == "undefined") {
		timestamp = new Date();
	}
	var t = new ASN1("revokedCertificate", ASN1.SEQUENCE, 
				new ASN1("userCertificate", ASN1.INTEGER, PKIXCommon.convertUnsignedInteger(serial)),
				new ASN1("revocationTime", ASN1.UTCTime, new ByteString(PKIXCommon.dtoUTC(timestamp), ASCII))
				);

	if (typeof(ext) == "undefined") {
		ext = new ASN1("crlExtensions", ASN1.SEQUENCE);
	}
	
	if ((typeof(reason) != "undefined") && (reason != -1)) {
		ext.add(new ASN1("reason", ASN1.SEQUENCE,
					new ASN1("extnID", ASN1.OBJECT_IDENTIFIER, new ByteString("id-ce-cRLReasons", OID)),
					new ASN1("extnValue", ASN1.OCTET_STRING,
						(new ASN1("cRLReason", ASN1.ENUMERATED, ByteString.valueOf(reason))).getBytes())
					)
				);
		t.add(ext);
	}
	
	this.revokedCertificates.push(t);
}



/**
 * Load list of revoked certificates from an existing CRL
 *
 * @param {String} filename the file name of the DER encoded CRL
 * @type Number
 * @return the value of the CRLNumber extension, 0 if extension not defined or -1 if file could not be loaded
 */
CRLGenerator.prototype.loadCRLEntries = function(filename) {
	var crlnumber = 0;
	
	try	{
		var crlbin = PKIXCommon.readFileFromDisk(filename);
		var crl = new ASN1(crlbin);
		print(crl);
		var tbs = crl.get(0);
		var i = 0;
		if ((i < tbs.length) && (tbs.get(i).tag == ASN1.INTEGER)) {		// Skip version if present
			i++;
		}
		i += 3;		// Skip signature, issuer, thisUpdate
		if ((i < tbs.length) && (tbs.get(i).tag == ASN1.UTCTime)) {		// nextUpdate if present
			i++;
		}
		if ((i < tbs.length) && (tbs.get(i).tag == ASN1.SEQUENCE)) {
			for (var j = 0; j < tbs.get(i).elements; j++) {
				this.revokedCertificates.push(tbs.get(i).get(j));
			}
			i++;
		}
		if ((i < tbs.length) && (tbs.get(i).tag == 0xA0)) {
			var l = tbs.get(i).get(0);
			var oid = new ByteString("id-ce-cRLNumber", OID);
			for (var j = 0; j < l.elements; j++) {
				var ext = l.get(j);
				if (ext.get(0).value.equals(oid)) {
					var extval = new ASN1(ext.get(1).value);
					crlnumber = extval.value.toUnsigned();
				}
			}
			
		}
	}
	catch(e) {
		GPSystem.trace(e);
		return -1;
	}
	return crlnumber;
}



/**
 * Gets the issuer name as TLV object
 *
 * @return the issuer RDNSequence
 * @type ASN1
 */
CRLGenerator.prototype.getIssuer = function() {
	if (this.issuer instanceof ASN1) {
		return this.issuer;
	} else {
		return PKIXCommon.encodeName(this.issuer);
	}
}



/**
 * Gets the thisUpdate TLV object
 *
 * @return the thisUpdate UTC encoded time
 * @type ASN1
 */
CRLGenerator.prototype.getThisUpdate = function() {
	var t = new ASN1("thisUpdate", ASN1.UTCTime, new ByteString(PKIXCommon.dtoUTC(this.thisUpdate), ASCII));
	return t;
}



/**
 * Gets the nextUpdate TLV object
 *
 * @return the nextUpdate UTC encoded time
 * @type ASN1
 */
CRLGenerator.prototype.getNextUpdate = function() {
	var t = new ASN1("nextUpdate", ASN1.UTCTime, new ByteString(PKIXCommon.dtoUTC(this.nextUpdate), ASCII));
	return t;
}



/**
 * Gets the signature algorithm TLV object
 *
 * @return the signature algorithm object
 * @type ASN1
 */
CRLGenerator.prototype.getSignatureAlgorithm = function() {
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
		throw new GPError("CRLGenerator", GPError.INVALID_MECH, this.signatureAlgorithm, "Invalid algorithm");
	}
		
	return t;
}

 

/**
 * Gets revoked certificates
 *
 * @return the list of revoked certificates
 * @type ASN1
 */
CRLGenerator.prototype.getRevokedCertificates = function() {
	var t = new ASN1("revokedCertificates", ASN1.SEQUENCE);
	for (var i = 0; i < this.revokedCertificates.length; i++) {
		t.add(this.revokedCertificates[i]);
	}
	return t;
}



/**
 * Gets the CRL extension as TLV object
 *
 * @return the CRL extensions
 * @type ASN1
 */
CRLGenerator.prototype.getExtensions = function() {
	var t = new ASN1("extensions", 0xA0);
	var s = new ASN1("extensions", ASN1.SEQUENCE);
	
	t.add(s);
	
	for (var i = 0; i < this.extensions.length; i++) {
		s.add(this.extensions[i]);
	}
	return t;
}



/**
 * Gets the part of the CRL that will be signed
 *
 * @return the TBSCertificate part
 * @type ASN1
 */
CRLGenerator.prototype.getTbsCertificateList = function() {
	var t = new ASN1("tbsCertList", ASN1.SEQUENCE);
	t.add(new ASN1("version", ASN1.INTEGER, new ByteString("01", HEX)));
	t.add(this.getSignatureAlgorithm());
	t.add(this.getIssuer());
	t.add(this.getThisUpdate());
	if (this.nextUpdate != null) {
		t.add(this.getNextUpdate());
	}
	if (this.revokedCertificates.length > 0) {
		t.add(this.getRevokedCertificates());
	}
	if (this.extensions.length > 0) {
		t.add(this.getExtensions());
	}
	return t;
}



/**
 * Generates the certificate.
 *
 * @return the generated certificate
 * @type X509
 */
CRLGenerator.prototype.generateCRL = function(privateKey) {
	var certlist = new ASN1("certificateList", ASN1.SEQUENCE);
	
	var tbs = this.getTbsCertificateList();
	certlist.add(tbs);
	certlist.add(this.getSignatureAlgorithm());
	
	var signature = this.crypto.sign(privateKey, this.signatureAlgorithm, tbs.getBytes());
	signature = (new ByteString("00", HEX)).concat(signature);

	var signatureValue = new ASN1("signatureValue", ASN1.BIT_STRING, signature);
	certlist.add(signatureValue);
	
	return certlist;
}



function CRLGeneratorTest() {

	var crypto = new Crypto();
	
	var caPrivateKey = new Key();
	caPrivateKey.setType(Key.PRIVATE);

	var caPublicKey = new Key();
	caPublicKey.setType(Key.PUBLIC);
	caPublicKey.setSize(1024);

	crypto.generateKeyPair(Crypto.RSA, caPublicKey, caPrivateKey);

//	var caPrivKey = new Key("profiles/kp_rsa_private.xml");

	var x = new CRLGenerator(crypto);

	x.reset();
	x.setSignatureAlgorithm(Crypto.RSA);
	var issuer = [{ C:"UT" },{ O:"ACME Corporation" },{ CN:"Test-CA" }];
	x.setIssuer(issuer);
	var now = new Date();
	x.setThisUpdate(now);
	var nextMonth = new Date();
	nextMonth.setMonth((now.getMonth() + 1) % 12);
	x.setNextUpdate(nextMonth);
	x.addAuthorityKeyIdentifierExtension(caPublicKey);
	x.addCRLNumberExtension(11);
	
	x.revokeCertificate(new ByteString("01", HEX));
	x.revokeCertificate(new ByteString("80", HEX), new Date());
	x.revokeCertificate(new ByteString("80", HEX), new Date(), CRLGenerator.keyCompromise);
	x.revokeCertificate(new ByteString("80", HEX), new Date(), CRLGenerator.superseded, new ASN1("crlExtensions", ASN1.SEQUENCE));
	
	var crl = x.generateCRL(caPrivateKey);
	
	var fn = GPSystem.mapFilename("crl.crl", GPSystem.USR);
	PKIXCommon.writeFileToDisk(fn, crl.getBytes());

	print(crl);
	
	var x = new CRLGenerator(crypto);
	x.reset();
	x.setSignatureAlgorithm(Crypto.RSA);
	var issuer = [{ C:"UT" },{ O:"ACME Corporation" },{ CN:"Test-CA" }];
	x.setIssuer(issuer);
	var now = new Date();
	x.setThisUpdate(now);
	var nextMonth = new Date();
	nextMonth.setMonth((now.getMonth() + 1) % 12);
	x.setNextUpdate(nextMonth);
	var crlnumber = x.loadCRLEntries(fn);
	assert(crlnumber == 11);
	x.addAuthorityKeyIdentifierExtension(caPublicKey);
	x.addCRLNumberExtension(crlnumber + 1);
	
	x.revokeCertificate(crypto.generateRandom(8), new Date(), CRLGenerator.keyCompromise);
	var crl = x.generateCRL(caPrivateKey);
//	PKIXCommon.writeFileToDisk(fn, crl.getBytes());
	
	print(crl);
}


