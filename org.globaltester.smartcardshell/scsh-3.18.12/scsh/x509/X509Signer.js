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
 * @fileoverview A Signer backed by a X.509 certificate
 */

var Holder = require('scsh/pki-db/Holder').Holder;
var Certificate = require('scsh/pki-db/Certificate').Certificate;
var PKIXCommon = require('scsh/x509/PKIXCommon').PKIXCommon;
var PKCS10 = require('scsh/pkcs/PKCS10').PKCS10;
var PKCS10Generator = require('scsh/x509/PKCS10Generator').PKCS10Generator;
var LongDate = require('scsh/pki-db/LongDate').LongDate;



/**
 * Create a signer based on a X.509 certificate
 *
 * @class Class implementing a signer backed by a X.509 certificate
 * @constructor
 * @param {DAOFactory} daof the factory that can create the required data access objects
 * @param {CryptoProviderFactory} cpf factory implementing getCryptoProvider() used to get access to crypto providers
 * @param {Holder} holder the holder object for this signer
 */
function X509Signer(daof, cpf, holder) {
	this.daof = daof;
	this.cpf = cpf;
	this.holder = holder;

	if (this.holder == null) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "Certificate holder " + holder + " not found");
	}

	if (this.getSigner()) {
		this.parsePolicyFromSigner();
	}
}

exports.X509Signer = X509Signer;



/**
 * Create a new signer
 *
 * @param {DAOFactory} daof the factory that can create the required data access objects
 * @param {String/Number} pathOrHolderId the path of holderIDs (eg. "/UTCVCA/UTDVCA/UTTERM") or the holderId from the database
 * @param {Number} certtype optional argument, default Holder.X509
 * @param {Object} template template for database entry
 * @type Number
 * @return the newly created holder id
 */
X509Signer.createSigner = function(daof, pathOrHolderId, certtype, template) {
	if (typeof(certtype) == "undefined") {
		certtype = Holder.X509;
	}

	var holderdao = daof.getHolderDAO();
	if (typeof(pathOrHolderId) == "string") {
		var holder = holderdao.newHolder(pathOrHolderId, certtype, template);
	} else {
		if (typeof(pathOrHolderId) == "undefined") {
			pathOrHolderId = 0;
		}

		var holder = holderdao.newHolderForParent(pathOrHolderId, certtype, template);
	}

	return holder.id;
}



/**
 * Set policy for signer object.
 *
 * The policy object shall contain the following properties
 *
 * <ul>
 * <li>distinguishedName - The distinguishedName object as defined in PKIXCommon.encodeName()</li>
 * <li>keySpecification - A Key object initialized with the key parameter.</li>
 * <li>signatureAlgorithm - A ByteString encoding the object identifier for the signature algorithm</li>
 * <li>validityDaysSelfSigned - Number of days the self-signed certificate is valid</li>
 * <li>validityDays - Number of days the issued certificate is valid</li>
 * <li>pathLenConstraint - Number of subordinate CAs</li>
 * <li>requestFormat - "pkcs10" or "sc-hsm"</li>
 * <li>overwriteKey - Set to true to overwrite a key with the same label</li>
 * </ul>
 *
 * @see PKIXCommon.encodeName()
 * @param {String} crldp the URL of the distribution point
 */
X509Signer.prototype.setPolicy = function(policy) {
	this.policy = policy;
}



/**
 * Determine signer name for newly generated signer
 *
 * @type String
 * @return the unique name
 */
X509Signer.prototype.determineSignerName = function() {
	var name = this.holder.id + ":X509Signer " + this.holder.signerNo + 1 + " [" + Date() + "]";
	var holderdao = this.daof.getHolderDAO();
	holderdao.updateSignerNo(this.holder, this.holder.signerNo + 1);
	return name;
}



/**
 * Determine subject distinguished name for new signer
 *
 * @param {String} name
 * @type String
 * @return the distringuished name for the new signer
 */
X509Signer.prototype.determineDistinguishedName = function(name) {
	return this.policy.distinguishedName;
}



/**
 * Determine the key usage for the request
 *
 * @type Number
 * @return the key usage defined in PKIXCommon
 */
X509Signer.prototype.getRequestKeyUsage = function() {
	return PKIXCommon.digitalSignature;
}



/**
 * Create a new signer key pair
 *
 * @param {String} name the signer name
 * @type ByteString
 * @return the subject key identifier
 */
X509Signer.prototype.newSigner = function(name, template) {
	if (!name) {
		name = this.determineSignerName();
	}

	if (!template || !template.keyDomain) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "Cannot create a signer without a template containing the keyDomain");
	}

	var cp = this.cpf.getCryptoProvider(template.keyDomain, true);
	try	{
		if (this.policy.overwriteKey) {
			cp.deleteIfExists = true;
		}

		var k = cp.generateKeyPair(name, this.policy.keySpecification);
		var prk = k.prk;
		var puk = k.puk;
		var req = k.req;
		var keyblob;

		var keyId = PKIXCommon.determineKeyIdentifier(puk);

		if (typeof(cp.getWrappedKey) == "function") {
			template.keyblob = cp.getWrappedKey(name);
		}

		var signerDAO = this.daof.getSignerDAO();
		this.signer = signerDAO.newSigner(this.holder, name, keyId, template);

		if (this.policy.requestFormat != "sc-hsm") {
			var gen = new PKCS10Generator(cp.getCrypto());
			gen.setSignatureAlgorithm(this.policy.reqSignatureAlgorithm);
			gen.setSubject(this.determineDistinguishedName());
			gen.setPublicKey(puk);
			gen.addKeyUsageExtension(this.getRequestKeyUsage());
			req = gen.generateCertificationRequest(prk);
			req = req.getBytes();
		}

		var requestDAO = this.daof.getRequestDAO();
		requestDAO.newRequest(this.holder, keyId, req);
	}
	finally {
		cp.release();
	}

	return keyId;
}



/**
 * Return the holderId from the holder database for this element
 *
 * @type Number
 * @return the holderId
 */
X509Signer.prototype.getHolderId = function() {
	return this.holder.id;
}



/**
 * Return the holder from the holder database for this element
 *
 * @type Number
 * @return the holderId
 */
X509Signer.prototype.getHolder = function() {
	return this.holder;
}



/**
 * Return the signer from the signer database for this element
 *
 * @type Signer
 * @return the signer value object or null
 */
X509Signer.prototype.getSigner = function() {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSigner()");
	if (this.signer) {
		GPSystem.log(GPSystem.DEBUG, module.id, "return cached signer");
		return this.signer;
	}

	var certDAO = this.daof.getCertificateDAO();
	this.currentCertificate = certDAO.getCurrentCertificate(this.holder);

	if (!this.currentCertificate) { // no active signer
		GPSystem.log(GPSystem.DEBUG, module.id, "no active signer for holder " + this.holder.id);
		return null;
	}

	var signerDAO = this.daof.getSignerDAO();
	this.signer = signerDAO.getSignerByKeyId(this.holder, this.currentCertificate.keyId);

	if (this.signer) {
		this.cpid = this.signer.keyDomain;
	}

	return this.signer;
}



/**
 * Parse the policy from the signer's values object
 *
 * @type Object
 * @return the policy
 */
X509Signer.prototype.parsePolicyFromSigner = function() {
	var signer = this.getSigner();

	if (signer == null) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "No active signer");
	}

	var c = signer.getContent();

	if (!c || !c.keySpecification) {
		return; // no policy
	}

	var dp = new Key();
	if (c.keySpecification.type == "EC") {
		dp.setComponent(Key.ECC_CURVE_OID, new ByteString(c.keySpecification.curve, OID));
	} else {
		dp.setSize(c.keySpecification.keysize);
	}

	var dn = PKIXCommon.parseDN(c.distinguishedName);

	this.policy = {
		distinguishedName: dn,
		signatureAlgorithm: c.signatureAlgorithm,
		reqSignatureAlgorithm: c.keySpecification.sigalg,
		validityDaysCertificates: c.validityDaysCertificates,
		validityDaysCRL: c.validityDaysCRL,
		pathLenConstraint: c.pathLenConstraint,
		keySpecification: dp
	}

	return this.policy;
}



X509Signer.prototype.getSubjectPolicyForRequest = function() {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSubjectPolicyForRequest()");

	var signer = this.getSigner();

	if (signer == null) {
		throw new GPError(module.id, GPError.INVALID_DATA, 1, "No active signer");
	}

	var c = signer.getContent();

	var dp = new Key();
	if (c.keySpecification.type == "EC") {
		dp.setComponent(Key.ECC_CURVE_OID, new ByteString(c.keySpecification.curve, OID));
	} else {
		dp.setSize(c.keySpecification.keysize);
	}

	var policy = {
		reqSignatureAlgorithm: c.keySpecification.sigalg,
		keySpecification: dp
	}

	return policy;
}



/**
 * Get request for the given subject key identifier
 *
 * @param {ByteString} keyId the subject key identifier
 * @type ByteString
 * @return the raw request
 */
X509Signer.prototype.getRequestBinary = function(keyId) {
	var requestDAO = this.daof.getRequestDAO();
	var request = requestDAO.getRequestByKeyId(this.holder, keyId);

	if (request == null) {
		return null;
	}

	return request.bytes;
}



/**
 * Get request for the given subject key identifier
 *
 * @param {ByteString} keyId the subject key identifier
 * @type PKCS10
 * @return the PKCS10 request
 */
X509Signer.prototype.getRequest = function(keyId) {
	var requestDAO = this.daof.getRequestDAO();
	var request = requestDAO.getRequestByKeyId(this.holder, keyId);

	if (request == null) {
		return null;
	}

	var req = new PKCS10(request.bytes);
	return req;
}



/*
X509Signer.prototype.activateSigner = function(name) {
}



X509Signer.prototype.importCertificate = function(name) {
}



X509Signer.prototype.getSignerList = function(usableOnly) {
}
*/



/**
 * Store a certificate issued for a certain holder
 *
 * @param {X509} cert the certificate
 * @param {Boolean} makeCurrent true if this certificate becomes the current certificate
 * @param {ByteString} keyId the key id that links this certificate to the signer (usually the subjectKeyIdentifier)
 * @param {Number} srId service request id
 * @type Number
 * @return the database id of the certificate
 */
X509Signer.prototype.storeCertificateForHolder = function(holder, cert, makeCurrent, keyId, srId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "storeCertificateForHolder(" + holder + "'" + cert + "'," + makeCurrent + "," + keyId + ")");

	var certdao = this.daof.getCertificateDAO();

	var issuer = cert.getIssuerDNString();
	var subject = cert.getSubjectDNString();
	var autid = cert.getAuthorityKeyIdentifier();
	var subid = cert.getSubjectKeyIdentifier();
	var serial = cert.getSerialNumber().toString(HEX);

	if ((autid && autid.equals(subid)) || issuer.equals(subject)) {
		var dir = Certificate.SHORT;
	} else {
		var dir = Certificate.UP;
	}

	var certificate = certdao.getCertificateBySerial(holder, serial, dir);

	if (certificate) {
		GPSystem.log(GPSystem.INFO, module.id, "storeCertificate() : We already have a different certificate for that serial number");
		GPSystem.log(GPSystem.INFO, module.id, "Existing: " + (new X509(certificate.bytes)));
		GPSystem.log(GPSystem.INFO, module.id, "New     : " + cert);

		return;
	}

	if (typeof(keyId) == "undefined") {
		keyId = PKIXCommon.determineKeyIdentifier(cert.getPublicKey());
	}

	var template = {
		keyId: keyId,
		expiry: new LongDate(cert.getNotAfter())
	};

	if (srId) {
		template.serviceRequestId = srId;
	}

	var certificate = certdao.newCertificate(holder, serial, dir, cert.getBytes(), template);

	if (makeCurrent || !holder.certId) {
		var holderdao = this.daof.getHolderDAO();
		holderdao.updateCurrentCertificate(holder, certificate);
	}

	return certificate.id;
}



/**
 * Store a certificate issued for this signer
 *
 * @param {X509} cert the certificate
 * @param {Boolean} makeCurrent true if this certificate becomes the current certificate
 * @param {ByteString} keyId the key id that links this certificate to the signer (usually the subjectKeyIdentifier)
 * @param {Number} srId service request id
 */
X509Signer.prototype.storeCertificate = function(cert, makeCurrent, keyId, srId) {
	return this.storeCertificateForHolder(this.holder, cert, makeCurrent, keyId, srId);
}



/**
 * Return the signer's certificate
 *
 * @type X509
 * @return the signer's certificate
 */
X509Signer.prototype.getSignerCertificate = function() {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSignerCertificate()");
	if (!this.currentCertificate) {
		this.getSigner();
	}

	if (this.signer && !this.currentCertificate) {
		var certDAO = this.daof.getCertificateDAO();
		this.currentCertificate = certDAO.getCurrentCertificate(this.holder);
	} else if (!this.signer) {
		GPSystem.log(GPSystem.DEBUG, module.id, "no active signer for holder " + this.holder.id);
		return null;
	}

	return new X509(this.currentCertificate.bytes);
}
