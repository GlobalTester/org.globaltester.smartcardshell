/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2016 CardContact Software & System Consulting
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
 * @fileoverview Generate invalid master lists for test purpose
 */



MasterListSigner = require('scsh/mrtd/MasterListSigner').MasterListSigner;
X509CertificateGenerator = require('scsh/x509/X509CertificateGenerator').X509CertificateGenerator;
PKIXCommon = require('scsh/x509/PKIXCommon').PKIXCommon;



function MasterListTestDataGen () {
	MasterListSigner.call(this);
}
MasterListTestDataGen.prototype = Object.create(MasterListSigner.prototype);
MasterListTestDataGen.constructor = MasterListTestDataGen;

exports.MasterListTestDataGen = MasterListTestDataGen;



/**
 * Generate CSCA key pair and root certificate
 *
 * @param {Object} dn the optional distinguished name
 * @param {Date} notBefore the optional effective date of the certificate
 * @param {Date} notAfter the optional expiration date of the certificate
 */
MasterListSigner.prototype.setupCSCA = function(dn, notBefore, notAfter) {
	if (dn) {
		this.cscaDN = dn;
	}

	// CA Key Pair
	this.cscaPriKey = new Key();
	this.cscaPriKey.setType(Key.PRIVATE);
	this.cscaPubKey = new Key();
	this.cscaPubKey.setType(Key.PUBLIC);
	this.cscaPubKey.setSize(2048);
	var crypto = new Crypto();
	crypto.generateKeyPair(Crypto.RSA, this.cscaPubKey, this.cscaPriKey);

	// CA Root Certificate
	this.cscaCert = this.generateCertificate(this.cscaPriKey, this.cscaPubKey, this.cscaDN, this.cscaDN, this.cscaPubKey, notBefore, notAfter);
}



/**
 * Quick setup.
 * Generate the signing key and corresponding certificates
 */
MasterListSigner.prototype.setupWithAlternativeSID = function() {
	this.setupCSCA();
	this.setupSignerWithAlternativeSID();
}



/**
 * Generate Master List Signer key pair and certificate
 * issued by the CSCA
 * @param {Date} notBefore the optional effective date of the certificate
 * @param {Date} notAfter the optional expiration date of the certificate
 */
MasterListSigner.prototype.setupSignerWithAlternativeSID = function(notBefore, notAfter) {
	if (!this.cscaPriKey || !this.cscaCert) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "Missing CSCA private key or certificate");
	}

	// Master List Key Pair
	this.mlPriKey = new Key();
	this.mlPriKey.setType(Key.PRIVATE);
	this.mlPubKey = new Key();
	this.mlPubKey.setType(Key.PUBLIC);
	this.mlPubKey.setSize(2048);
	var crypto = new Crypto();
	crypto.generateKeyPair(Crypto.RSA, this.mlPubKey, this.mlPriKey);

	// Master List Signer Certificate
	this.mlsDN = { C:"UT", O:"IT", OU:"SEC", CN:"CSCA Master List Signer" };
	this.mlCert = this.generateCertificate(this.cscaPriKey, this.mlPubKey, this.cscaDN, this.mlsDN, this.cscaCert.getPublicKey(), notBefore, notAfter);

	// Setup this signer
	this.addSignerCertificates(this.mlCert, this.cscaCert);
	this.addSignerWithIssuerAndSerial(this.mlPriKey, this.mlCert, new ByteString("id-sha256", OID));
}



/**
 * Generate the Master List with an incorrect eContentType
 *
 * @type ByteString
 * @return the encoded Master List with an incorrect eContentType
 */
MasterListSigner.prototype.generateMasterListWithIncorrectEContentType = function() {
	return this.cms.generate(new ByteString("0.4.0.127.0.7.3.2.2", OID));
}



/**
 * Generate the Master List with an invalid signature
 *
 * @type ByteString
 * @return the encoded Master List with an invalid signature
 */
MasterListSigner.prototype.generateMasterListWithInvalidSignature = function() {
	var encodedML =  this.cms.generate(new ByteString("id-icao-cscaMasterList", OID));
	return this.invalidateSignature(encodedML);
}



/**
 * Manipulate the signature of a given Master List
 *
 * @param {ByteString} encodedML the encoded Master List
 * @type ByteString
 * @return the encoded Master List with an invalid signature
 */
MasterListTestDataGen.prototype.invalidateSignature = function(encodedML) {
	var mlcms = new CMSSignedData(encodedML);
	assert(mlcms.isSignerInfoSignatureValid(0));

	// Invalidate signature
	var signature = mlcms.getSignerInfoSignature(0);
	var invSig = signature.add(1);

	// Replace signature in encoded master list with the invalid one

	var offs = encodedML.find(signature);
	var upperPart = encodedML.bytes(0, offs);
	var lowerPart = encodedML.bytes(offs + signature.length);
	var invML = upperPart.concat(invSig).concat(lowerPart);

	var mlcms = new CMSSignedData(invML);
	assert(!mlcms.isSignerInfoSignatureValid(0));

	return invML;
}



/**
 * Helper function to generate certificates
 *
 * @param {Key} priKey the signing key
 * @param {Key} pubKey the certificates public key
 * @param {Object} issuer the issuer name
 * @param {Object} subject the subject name
 * @param {Key} signerPubKey the optional signer's public key which will be referenced in the authority key identifier
 * @param {Date} notBefore the optional effective date of the certificate
 * @param {Date} notAfter the optional expiration date of the certificate
 */
MasterListTestDataGen.prototype.generateCertificate = function(priKey, pubKey, issuer, subject, signerPubKey, notBefore, notAfter) {
	var crypto = new Crypto();

	var x = new X509CertificateGenerator(crypto);

	x.reset();
	x.setSerialNumber(new ByteString("01", HEX));
	x.setSignatureAlgorithm(Crypto.RSA_SHA256);

	x.setIssuer(issuer);
	if (notBefore && notAfter) {
		x.setNotBefore(notBefore);
		x.setNotAfter(notAfter);
	} else {
		var t = new Date();
		x.setNotBefore(t);
		x.setNotAfter(PKIXCommon.addDays(t, 180));
	}
	x.setSubject(subject);

	x.setPublicKey(pubKey);

	x.addKeyUsageExtension(	PKIXCommon.digitalSignature |
							PKIXCommon.keyCertSign |
							PKIXCommon.cRLSign );

	x.addBasicConstraintsExtension(true, 0);
	x.addSubjectKeyIdentifierExtension();
	if (signerPubKey) {
		x.addAuthorityKeyIdentifierExtension(signerPubKey);
	}

	var cert = x.generateX509Certificate(priKey);
	return cert;
}