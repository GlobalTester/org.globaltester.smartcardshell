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
 * @fileoverview Master List Signer
 */



X509CertificateGenerator = require('scsh/x509/X509CertificateGenerator').X509CertificateGenerator;
PKIXCommon = require('scsh/x509/PKIXCommon').PKIXCommon;



function MasterListSigner() {
	this.cms = new CMSGenerator(CMSGenerator.TYPE_SIGNED_DATA);

	// Default Distinguished Names
	this.cscaDN = { C:"UT", O:"IT", OU:"SEC", CN:"CSCA Self Signed" };
	this.mlsDN = { C:"UT", O:"IT", OU:"SEC", CN:"CSCA Master List Signer" };
}

exports.MasterListSigner = MasterListSigner;



/**
 * Set a list of CSCA certificates to this Master List
 *
 * @param {X509[]} the list of CSCA certificates
 */
MasterListSigner.prototype.setCSCACertificateList = function(certificates) {
	var content = new ASN1(ASN1.SEQUENCE);

	// Add CscaMasterList Version
	content.add(new ASN1(ASN1.INTEGER, ByteString.valueOf(0)));

	// Add set of certificates
	var certSet = new ASN1(ASN1.SET);
	for (var i = 0; i < certificates.length; i++) {
		certSet.add(new ASN1(certificates[i].getBytes()));
	}
	// Add CSCA certificate
	certSet.add(new ASN1(this.cscaCert.getBytes()));
	content.add(certSet);

	this.cms.setDataContent(content.getBytes());
}



/**
 * Add certificates which belong to the CMS SignedData type.
 * According to the TR-CSCA countersigning and Master List Issuance V1.0
 * the signer certificate must be included and the csca certificate should be
 * included.
 *
 * @param {X509} signerCertificate the Master List Signer Certificate
 * @param {X509} cscaCertificate the optional CSCA certificate
 */
MasterListSigner.prototype.addSignerCertificates = function(signerCertificate, cscaCertificate) {
	this.cms.addCertificate(signerCertificate);
	if (cscaCertificate) {
		this.cms.addCertificate(cscaCertificate);
	}
}



/**
 * Add signing key, certificate and hash algorithm to this Master List Signer.
 *
 * @param {Key} signingKey the signing key of this Master List Signer
 * @param {X509} signerCertificate the signer certificate of this Master List Signer
 * @param {ByteString} hashOID the hash algorithm OID used for signing
 */
MasterListSigner.prototype.addSignerWithIssuerAndSerial = function(signingKey, signerCertificate, hashOID) {
	this.cms.addSigner(signingKey, signerCertificate, hashOID);
}



/**
 * Add signing key, certificate and hash algorithm to this Master List Signer.
 *
 * @param {Key} signingKey the signing key of this Master List Signer
 * @param {X509} signerCertificate the signer certificate of this Master List Signer
 * @param {ByteString} hashOID the hash algorithm OID used for signing
 */
MasterListSigner.prototype.addSignerWithSubjectKeyID = function(signingKey, signerCertificate, hashOID) {
	var keyID = signerCertificate.getNative().getExtensionValue("2.5.29.14").bytes(4);
	this.cms.addSigner(signingKey, keyID, hashOID);
}



/**
 * Helper function to generate certificates
 *
 * @param {Key} priKey the signing key
 * @param {Key} pubKey the certificates public key
 * @param {Object} issuer the issuer name
 * @param {Object} subject the subject name
 * @param {Key} signerPubKey the optional signer's public key which will be referenced in the authority key identifier
 */
MasterListSigner.prototype.generateCertificate = function(priKey, pubKey, issuer, subject, signerPubKey) {
	var crypto = new Crypto();

	var x = new X509CertificateGenerator(crypto);

	x.reset();
	x.setSerialNumber(new ByteString("01", HEX));
	x.setSignatureAlgorithm(Crypto.RSA_SHA256);

	x.setIssuer(issuer);
	var t = new Date();
	x.setNotBefore(t);
	x.setNotAfter(PKIXCommon.addDays(t, 180));
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



/**
 * Generate CSCA key pair and root certificate
 *
 * @param {Object} dn the optional distinguished name
 */
MasterListSigner.prototype.setupCSCA = function(dn) {
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
	this.cscaCert = this.generateCertificate(this.cscaPriKey, this.cscaPubKey, this.cscaDN, this.cscaDN, this.cscaPubKey);
}



/**
 * Generate Master List Signer key pair and certificate
 * issued by the CSCA
 *
 * @param {Object} dn the optional distinguished name
 */
MasterListSigner.prototype.setupSigner = function(dn) {
	if (!this.cscaPriKey || !this.cscaCert) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "Missing CSCA private key or certificate");
	}

	if (dn) {
		this.mlsDN = dn;
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
	this.mlCert = this.generateCertificate(this.cscaPriKey, this.mlPubKey, this.cscaDN, this.mlsDN, this.cscaCert.getPublicKey());

	// Setup this signer
	this.addSignerCertificates(this.mlCert, this.cscaCert);
	this.addSignerWithSubjectKeyID(this.mlPriKey, this.mlCert, new ByteString("id-sha256", OID));
}


/**
 * Quick setup.
 * Generate the signing key and corresponding certificates
 */
MasterListSigner.prototype.setup = function() {
	this.setupCSCA();
	this.setupSigner();
}



/**
 * Generate the Master List.
 *
 * Prior to generating the Master List, the setup functions addSignerCertificates and addSignerWithIssuerAndSerial/addSignerWithSubjectKeyID must be called.
 *
 * @type ByteString
 * @return the Master List
 */
MasterListSigner.prototype.generateMasterList = function() {
	return this.cms.generate(new ByteString("id-icao-cscaMasterList", OID));
}



/**
 * Reset signer and all certificates. Keep generated keys.
 */
MasterListSigner.prototype.resetCMS = function() {
	this.cms = new CMSGenerator(CMSGenerator.TYPE_SIGNED_DATA);
}