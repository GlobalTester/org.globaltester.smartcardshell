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
 * @fileoverview A Issuer for X.509 Certificates
 */

var X509Signer = require('scsh/x509/X509Signer').X509Signer;

var PKIXCommon = require("scsh/x509/PKIXCommon").PKIXCommon;
var X509CertificateGenerator = require("scsh/x509/X509CertificateGenerator").X509CertificateGenerator;
var CRLGenerator = require("scsh/x509/CRLGenerator").CRLGenerator;



/**
 * Create a certification authority that issues X.509 certificates and CRLs
 *
 * @class Class implementing a certification authority issuing X.509 certificates and CRLs
 * @constructor
 * @param {DAOFactory} daof the factory that can create the required data access objects
 * @param {CryptoProviderFactory} cpf factory implementing getCryptoProvider() used to get access to crypto providers
 * @param {Holder} holder the holder object for this signer the database
 */
function X509CertificateIssuer(daof, cpf, holder) {
	X509Signer.call(this, daof, cpf, holder);
	this.crldp = [];
}

X509CertificateIssuer.prototype = Object.create(X509Signer.prototype);
X509CertificateIssuer.constructor = X509CertificateIssuer;

exports.X509CertificateIssuer = X509CertificateIssuer;



/**
 * Create a new certificate issuer
 *
 * @param {DAOFactory} daof the factory that can create the required data access objects
 * @param {String/Number} pathOrHolderId the path of holderIDs (eg. "/UTCVCA/UTDVCA/UTTERM") or the holderId from the database
 * @param {Number} certtype optional argument, default Holder.X509
 * @type Number
 * @return the newly created holder id
 */
X509CertificateIssuer.createCertificateIssuer = function(daof, pathOrHolderId, certtype, template) {
	return X509Signer.createSigner(daof, pathOrHolderId, certtype, template);
}



/**
 * Add a CRL distribution point to issued certificates
 *
 * @param {String} crldp the URL of the distribution point
 */
X509CertificateIssuer.prototype.addCRLDistributionPoint = function(crldp) {
	this.crldp.push(crldp);
}



/**
 * Create a new randomly generated certificate serial number
 *
 * @private
 * @type ByteString
 * @return a 8 byte bytestring that resembles an unsigned integer
 */
X509CertificateIssuer.prototype.newSerialNumber = function() {
	var crypto = new Crypto();
	var serial = crypto.generateRandom(8);

	// Strip first bit to make integer unsigned
	if (serial.byteAt(0) > 0x7F) {
		serial = ByteString.valueOf(serial.byteAt(0) & 0x7F).concat(serial.bytes(1));
	}
	return serial;
}



/**
 * Issue a self-signed certificate for the given keyId.
 *
 * The key must have been previously generated using the newSigner() method
 *
 * @param {ByteString} keyId the subject key identifier
 * @param {Number} srId service request id to be stored with issued certificate
 */
X509CertificateIssuer.prototype.issueSelfSignedCertificate = function(keyId, srId) {

	if (keyId) {
		var signerDAO = this.daof.getSignerDAO();
		var signer = signerDAO.getSignerByKeyId(this.holder, keyId);
	} else {
		var signer = this.signer;
	}

	if (!signer) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "No signer with keyId " + keyId + " found");
	}

	var cp = this.cpf.getCryptoProvider(signer.keyDomain, true);

	if (!cp) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "Signer is offline (Key Domain : " + this.signer.keyDomain + ")");
	}

	try	{
		var prk = cp.getPrivateKeyByKeyId(signer.keyId, signer.keyblob);

		if (prk == null) {
			throw new GPError(module.id, GPError.INVALID_DATA, 1, "No key with keyId " + signer.keyId + " found");
		}

		var req = this.getRequest(signer.keyId);

		if (req == null) {
			throw new GPError(module.id, GPError.INVALID_DATA, 1, "No request with keyId " + signer.keyId + " found");
		}

		var pub = req.getPublicKey();

		var gen = new X509CertificateGenerator(cp.getCrypto());
		gen.encodeECDomainParameter = false;

		gen.reset();
		gen.setSerialNumber(this.newSerialNumber());
		gen.setSignatureAlgorithm(this.policy.signatureAlgorithm);
		var subject = req.getSubject();
		gen.setIssuer(subject);
		var ced = new Date();
		var cxd = PKIXCommon.addDays(ced, this.policy.validityDaysSelfSigned);
		gen.setNotBefore(ced);
		gen.setNotAfter(cxd);
		gen.setSubject(subject);
		gen.setPublicKey(pub);
		gen.addSubjectKeyIdentifierExtension();
		gen.addKeyUsageExtension(PKIXCommon.keyCertSign | PKIXCommon.cRLSign );
		gen.addBasicConstraintsExtension(true, this.policy.pathLenConstraint);

		var cert = gen.generateX509Certificate(prk);

		var id = this.storeCertificate(cert, true, signer.keyId, srId);
	}
	finally {
		cp.release();
	}

	return { id: id, cert: cert };
}



/**
 * Issue a new certificate for the given subject and public key
 *
 * @param {Number/String/Object} certholder the holder id, path or object
 * @param {Key} pubkey the public key
 * @param {Object} subject in ASN1 format or a format accepted by PKIXCommon.encodeName()
 * @param {Object[]} extensions array of certificate extensions objects with properties oid{String}, critical{boolean} and value{ByteString}
 * @param {Number} srId service request id to be stored with issued certificate
 * @type X509
 * @return the newly generated certificate
 */
X509CertificateIssuer.prototype.issueCertificate = function(certholder, pubkey, subject, extensions, srId) {
	assert(pubkey instanceof Key, "Argument pubkey must be instance of Key");

	if (typeof(certholder) != "object") {
		var holderdao = this.daof.getHolderDAO();

		if (typeof(pathOrHolderId) == "string") {
			certholder = holderdao.getHolder(certholder);
		} else {
			certholder = holderdao.getHolderById(certholder);
		}
	}

	if (!certholder) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "Holder " + certholder + " not found");
	}

	var icert = this.getSignerCertificate();

	if (!icert) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "No active signer found");
	}

	var cp = this.cpf.getCryptoProvider(this.signer.keyDomain, true);

	if (!cp) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "Signer is offline (Key Domain : " + this.signer.keyDomain + ")");
	}

	try	{
		var prk = cp.getPrivateKeyByKeyId(this.signer.keyId, this.signer.keyblob);

		if (prk == null) {
			throw new GPError(module.id, GPError.INVALID_DATA, 1, "No key with keyId " + this.signer.keyId + " found");
		}

		var issuer = PKIXCommon.getSubjectAsASN1(icert);

		var gen = new X509CertificateGenerator(cp.getCrypto());
		gen.encodeECDomainParameter = false;

		gen.reset();
		gen.setSerialNumber(this.newSerialNumber());
		gen.setSignatureAlgorithm(this.policy.signatureAlgorithm);
		gen.setIssuer(issuer);
		var ced = new Date();
		var cxd = PKIXCommon.addDays(ced, this.policy.validityDaysCertificates);
		gen.setNotBefore(ced);
		gen.setNotAfter(cxd);
		gen.setSubject(subject);
		gen.setPublicKey(pubkey);
		gen.addSubjectKeyIdentifierExtension();
		gen.addAuthorityKeyIdentifierExtension(icert.getSubjectKeyIdentifier());

		if ((typeof(this.policy.pathLenConstraint) != "undefined") && (this.policy.pathLenConstraint > 0)) {
			gen.addBasicConstraintsExtension(true, this.policy.pathLenConstraint - 1);
		} else {
			gen.addBasicConstraintsExtension(false, 0);
		}

		if (this.crldp.length > 0) {
			gen.addCRLDistributionPointURL(this.crldp);
		}

		if (typeof(extensions) == "object") {
			for (var i = 0; i < extensions.length; i++) {
				gen.addExtension(extensions[i].oid, extensions[i].critical, extensions[i].value);
			}
		}

		var cert = gen.generateX509Certificate(prk);

		var id = this.storeCertificateForHolder(certholder, cert, false, undefined, srId);
	}
	finally {
		cp.release();
	}
	return { id: id, cert: cert };
}



/**
 * Extension handler method for Sub-CA certificates
 *
 * @private
 */
X509CertificateIssuer.prototype.addExtForSubCA = function(certgen, extvalues) {

	certgen.addKeyUsageExtension(PKIXCommon.keyCertSign | PKIXCommon.cRLSign );
	certgen.addBasicConstraintsExtension(true, this.policy.pathLenConstraint - 1);
}



/**
 * Extension handler method for TLS server certificates
 *
 * @private
 */
X509CertificateIssuer.prototype.addExtForTLSServer = function(certgen, extvalues) {

	certgen.addKeyUsageExtension( PKIXCommon.keyAgreement | PKIXCommon.keyEncipherment);
	certgen.addBasicConstraintsExtension(false, 0);

	certgen.addExtendedKeyUsages(["id-csn-369791-tls-server", "id-kp-serverAuth"]);

	var ext = new ASN1("subjectAltName", ASN1.SEQUENCE,
						new ASN1("dNSName", 0x82, new ByteString(extvalues["dNSName"], ASCII))
					);
	certgen.addExtension("id-ce-subjectAltName", false, ext.getBytes());
}



/**
 * Extension handler method for TLS client certificates
 *
 * @private
 */
X509CertificateIssuer.prototype.addExtForTLSClient = function(certgen, extvalues) {
	certgen.addKeyUsageExtension( PKIXCommon.digitalSignature);
	certgen.addBasicConstraintsExtension(false, 0);

	// certgen.addExtendedKeyUsages(["id-csn-369791-tls-client", "id-kp-clientAuth"]);
	certgen.addExtendedKeyUsages(["id-kp-clientAuth"]);
}



/**
 * Extension handler method for certificates suitable for TLS client authentication and e-Mail signature and encryption
 *
 * @private
 */
X509CertificateIssuer.prototype.addExtForEmailAndTLSClient = function(certgen, extvalues) {

	certgen.addKeyUsageExtension( PKIXCommon.digitalSignature | PKIXCommon.keyEncipherment);
	certgen.addBasicConstraintsExtension(false, 0);

	var ext = new ASN1("subjectAltName", ASN1.SEQUENCE,
						new ASN1("rfc822Name", 0x81, new ByteString(extvalues["email"], ASCII))
					);
	certgen.addExtension("id-ce-subjectAltName", false, ext.getBytes());

	certgen.addExtendedKeyUsages(["id-kp-clientAuth", "id-kp-emailProtection"]);
}



/**
 * Issue a CRL
 *
 * @type CRL
 * @return the newly issued CRL
 */
X509CertificateIssuer.prototype.issueCRL = function() {
	GPSystem.log(GPSystem.DEBUG, module.id, "issueCRL()");

	var icert = this.getSignerCertificate();
	if (!icert) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "No active signer found");
	}

	var c = this.signer.getContent();
	if (c && c.crl) {
		var latestCRL = new CRLGenerator();
		var crlNumber = latestCRL.loadCRLEntries(new ByteString(c.crl, HEX));
		crlNumber++;
	}

	var cp = this.cpf.getCryptoProvider(this.signer.keyDomain, true);

	if (!cp) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "Signer is offline (Key Domain : " + this.signer.keyDomain + ")");
	}

	try	{
		var prk = cp.getPrivateKeyByKeyId(this.signer.keyId, this.signer.keyblob);

		if (prk == null) {
			throw new GPError(module.id, GPError.INVALID_DATA, 1, "No key with keyId " + this.signer.keyId + " found");
		}

		var x = new CRLGenerator(cp.getCrypto());

		x.reset();
		x.setSignatureAlgorithm(this.policy.signatureAlgorithm);
		var issuer = PKIXCommon.getSubjectAsASN1(icert);
		x.setIssuer(issuer);
		var now = new Date();
		x.setThisUpdate(now);
		x.setNextUpdate(PKIXCommon.addDays(now, this.policy.validityDaysCRL));

		var certdao = this.daof.getCertificateDAO();
		var revocationList = certdao.getRevokedCertificates(this.holder.id, now);

		for each (var cert in revocationList) {
			var serial = new ByteString(cert.serial, HEX);

			var reason = this.mapStatusToReasonCode(cert.status);

			if (cert.revocationDate) {
				var revocationDate = cert.revocationDate;
			} else {
				var revocationDate = now;
				certdao.updateRevocationDate(cert.id, now);
			}

			if (cert.invalidityDate) {
				var invalidityDate = cert.invalidityDate;
			} else {
				var invalidityDate = now;
			}
			var extensions = new ASN1("crlExtensions", ASN1.SEQUENCE);
			extensions.add(x.createInvalidityDateExt(invalidityDate));

			x.revokeCertificate(serial, revocationDate, reason, extensions);
		}

		if (!crlNumber) {
			var crlNumber = 1;
		}
		x.addCRLNumberExtension(crlNumber);

		var crl = x.generateCRL(prk);

		c.crl = crl.getBytes().toString(HEX);
		this.signer.setContent(c);
		var signerDAO = this.daof.getSignerDAO();
		signerDAO.updateContent(this.signer);
	}
	finally {
		cp.release();
	}
	return crl;
}



X509CertificateIssuer.prototype.mapStatusToReasonCode = function(status) {
	switch(status) {
	  case OCSPQuery.REVOKED:
		return null; // "...the reason code CRL entry extension SHOULD be absent instead of using the unspecified (0) reasonCode value." [RFC 5280, 5.3.1]
	  case OCSPQuery.KEYCOMPROMISE:
		return CRLGenerator.keyCompromise;
	  case OCSPQuery.CACOMPROMISE:
		return CRLGenerator.cACompromise;
	  case OCSPQuery.AFFILIATIONCHANGED:
		return CRLGenerator.affiliationChanged;
	  case OCSPQuery.SUPERSEDED:
		return CRLGenerator.superseded;
	  case OCSPQuery.CESSATIONOFOPERATION:
		return CRLGenerator.cessationOfOperation;
	  case OCSPQuery.CERTIFICATEHOLD:
		return CRLGenerator.certificateHold;
	  case OCSPQuery.REMOVEFROMCRL:
		return CRLGenerator.removeFromCRL;
	  case OCSPQuery.PRIVILEGEWITHDRAWN:
		return CRLGenerator.privilegeWithdrawn;
	  case OCSPQuery.AACOMPROMISE:
		return CRLGenerator.aACompromise;
	}

 	throw new GPError(module.id, GPError.INVALID_DATA, 1, "Unexpected status: " + status);
}



X509CertificateIssuer.prototype.getDNMask = function(holderId) {
	var signer = this.getSigner();
	var c = signer.getContent();
	return c.dnmask;
}



X509CertificateIssuer.prototype.isOperational = function() {
	GPSystem.log(GPSystem.DEBUG, module.id, "isOperational()");

	var icert = this.getSignerCertificate();
	if (!icert) {
		// No active signer found
		return false;
	}

	var cp = this.cpf.getCryptoProvider(this.signer.keyDomain, true);

	if (!cp) {
		// Signer offline
		return false;
	}

	try	{
		var prk = cp.getPrivateKeyByKeyId(this.signer.keyId, this.signer.keyblob);

		if (prk == null) {
			// Key not found
			return false;
		}
	} finally {
		cp.release();
	}

	return true;
}
