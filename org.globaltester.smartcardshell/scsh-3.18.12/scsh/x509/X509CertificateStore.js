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
 * @fileoverview Generic X509 certificate, request and key store
 */

var PKIXCommon = require('scsh/x509/PKIXCommon').PKIXCommon;
var Certificate = require('scsh/pki-db/Certificate').Certificate;
var Holder = require('scsh/pki-db/Holder').Holder;
var LongDate = require('scsh/pki-db/LongDate').LongDate;
var PKCS8 = require('scsh/pkcs/PKCS8').PKCS8;
var PKCS10 = require('scsh/pkcs/PKCS10').PKCS10;


/**
 * Create an object to access a X509 certificate store.
 *
 * @class Class that abstracts a certificate, request and key store for a X509 PKI.
 *
 * @constructor
 * @param {DAOFactory} DAOFactory the factory that can create data access objects for persistent information
 */
function X509CertificateStore(daof) {
	assert(daof, "Parameter doaf can't be empty");

	this.daof = daof;
	this.certtype = Holder.X509;
}

exports.X509CertificateStore = X509CertificateStore;



/**
 * Strip the last element of the path, effectively defining the parent within the path
 *
 * @param {String} path the path to strip the last element from
 * @returns the parent path or null for the root
 * @type String
 */
X509CertificateStore.parentPathOf = function(path) {
	assert(typeof(path) == "string", "Argument path must be string");
	var ofs = path.lastIndexOf("/");
	if (ofs <= 0) {
		return null;
	}
	return path.substr(0, ofs);
}



/**
 * Return the n-element of the path
 *
 * @param {String} path the path to return the last element from
 * @returns the last path element or null for the root
 * @type String
 */
X509CertificateStore.nthElementOf = function(path, n) {
	assert(typeof(path) == "string", "Argument path must be string");
	var pe = path.substr(1).split("/");
	if (typeof(n) == "undefined") {
		return pe[pe.length - 1];
	}
	return pe[n];
}



/**
 * Return a suitable crypto object. This may be overwritten by derived classes
 *
 * @type Crypto
 * @return the Crypto object
 */
X509CertificateStore.prototype.getCrypto = function() {
	if (this.crypto == undefined) {
		this.crypto = new Crypto();
	}
	return this.crypto;
}



/**
 * Check if holder exists for path or holderId
 *
 * @param {String/Number} pathOrHolderId
 * @type Holder
 * @return true if holder exists
 * @private
 */
X509CertificateStore.prototype.hasHolder = function(pathOrHolderId) {
	var holderdao = this.daof.getHolderDAO();

	if (typeof(pathOrHolderId) == "number") {
		var holder = holderdao.getHolderById(pathOrHolderId, this.certtype);
	} else {
		var holder = holderdao.getHolder(pathOrHolderId, this.certtype);
	}
	return holder != null;
}



/**
 * List certificate holders for a given PKI element
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @returns a list of holder ids, possibly empty
 * @type String[]
 */
X509CertificateStore.prototype.listHolders = function(pathOrHolderId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listHolders(" + pathOrHolderId + ")");

	var holderdao = this.daof.getHolderDAO();

	var result = holderdao.getHolderList(pathOrHolderId, this.certtype);
	return result;
}



/**
 * Get existing holder object for given path or holderId
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {Boolean} create create if holder doesn't exist
 * @type Holder
 * @return the holder object
 * @private
 */
X509CertificateStore.prototype.getHolder = function(pathOrHolderId, create) {
	var holderdao = this.daof.getHolderDAO();

	if (typeof(pathOrHolderId) == "number") {
		var holder = holderdao.getHolderById(pathOrHolderId, this.certtype);
	} else {
		var holder = holderdao.getHolder(pathOrHolderId, this.certtype);
	}

	if (!holder) {
		if (!create) {
			throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate holder for " + pathOrHolderId);
		}
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found, creating new.");
		if (typeof(pathOrHolderId) == "number") {
			holder = holderdao.newHolderWithParent(0, this.certtype);
		} else {
			holder = holderdao.newHolder(pathOrHolderId, this.certtype);
		}
	}

	return holder;
}



/**
 * Create new signer based on key pair generated externally
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {String} name the unique name of the signer in the holder context
 * @param {Key} puk the public key
 * @param {ByteString} keyblob the wrapped private key
 * @type ByteString
 * @return the subject key identifier
 */
X509CertificateStore.prototype.newSigner = function(pathOrHolderId, name, puk, keyblob) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newSigner(" + pathOrHolderId + "," + name + ")");

	var holder = this.getHolder(pathOrHolderId, false);

	var keyId = PKIXCommon.determineKeyIdentifier(puk);

	var template = {};

	if (keyblob instanceof ByteString)  {
		template.keyblob = keyblob;
	}

	var signerDAO = this.daof.getSignerDAO();
	signerDAO.newSigner(holder, name, keyId, template);
	return keyId;
}



/**
 * Get the signer identified by the keyId
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {ByteString} keyId the key identifier
 * @type Signer
 * @return this Signer object
 */
X509CertificateStore.prototype.getSigner = function(pathOrHolderId, keyId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSigner(" + pathOrHolderId + "," + keyId + ")");

	var holder = this.getHolder(pathOrHolderId, false);

	var signerDAO = this.daof.getSignerDAO();

	var signer = signerDAO.getSignerByKeyId(holder, keyId);

	if (!signer) {
		return null;
	}

	return signer;
}



/**
 * Generate key pair
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {String} name the unique name of the signer in the holder context
 * @param {Number} algo the key generation algorithm (Crypto.EC or Crypto.RSA)
 * @param {Key} prk the private key template
 * @param {Key} puk the public key template
 * @type ByteString
 * @return the subject key identifier
 */
X509CertificateStore.prototype.generateKeyPair = function(pathOrHolderId, name, algo, prk, puk) {
	GPSystem.log(GPSystem.DEBUG, module.id, "generateKeyPair(" + pathOrHolderId + "," + name + ")");

	var holder = this.getHolder(pathOrHolderId, false);

	var crypto = this.getCrypto();

	// Generate key pair
	crypto.generateKeyPair(algo, puk, prk);

	var keyId = PKIXCommon.determineKeyIdentifier(puk);

	var template = {
		keyblob: PKCS8.encodeKeyUsingPKCS8Format(prk)
	};

	var signerDAO = this.daof.getSignerDAO();
	signerDAO.newSigner(holder, name, keyId, template);
	return keyId;
}



/**
 * Get a private key in the certificate store
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {String} name the unique name of the signer in the holder context
 * @returns the private key or null if not found
 * @type Key
 */
X509CertificateStore.prototype.getPrivateKeyByName = function(pathOrHolderId, name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getPrivateKey(" + pathOrHolderId + "," + name + ")");

	var holder = this.getHolder(pathOrHolderId, false);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.getSignerByName(holder, name);

	if (!signer) {
		return signer;
	}

	return PKCS8.decodeKeyFromPKCS8Format(signer.keyblob);
}



/**
 * Get a private key in the certificate store
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {ByteString} keyId the unique key identifier
 * @returns the private key or null if not found
 * @type Key
 */
X509CertificateStore.prototype.getPrivateKeyByKeyId = function(pathOrHolderId, keyId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getPrivateKeyByKeyId(" + pathOrHolderId + "," + keyId + ")");

	var holder = this.getHolder(pathOrHolderId, false);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.getSignerByKeyId(holder, keyId);

	if (!signer) {
		return signer;
	}

	return PKCS8.decodeKeyFromPKCS8Format(signer.keyblob);
}



/**
 * Remove private key
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {String} name the unique name of the signer in the holder context
 * @returns true is deleted
 * @type boolean
 */
X509CertificateStore.prototype.deletePrivateKey = function(pathOrHolderId, name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteRequest(" + pathOrHolderId + "," + name + ")");

	var holder = this.getHolder(pathOrHolderId, true);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.getSignerByName(holder, name.toString());

	if (!signer) {
		return false;
	}

	return signerDAO.deleteSigner(signer);
}



/**
 * Remove request
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {ByteString} keyId the unique keyId of the request in the holder context
 * @returns true is deleted
 * @type boolean
 */
X509CertificateStore.prototype.deleteRequest = function(pathOrHolderId, keyId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteRequest(" + pathOrHolderId + "," + keyId + ")");

	var holder = this.getHolder(pathOrHolderId, true);

	var requestDAO = this.daof.getRequestDAO();
	var request = requestDAO.getRequestByKeyId(holder, keyId);

	if (!request) {
		return false;
	}

	return requestDAO.deleteRequest(request);
}



/**
 * Store a certificate request in the certificate store
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {PKCS10} req the request
 * @type ByteString
 * @return the request's keyId
 */
X509CertificateStore.prototype.storeRequest = function(pathOrHolderId, req) {
	GPSystem.log(GPSystem.DEBUG, module.id, "storeRequest(" + pathOrHolderId + "," + req + ")");

	var holder = this.getHolder(pathOrHolderId, true);

	var requestDAO = this.daof.getRequestDAO();

	var puk = req.getPublicKey();
	var keyId = PKIXCommon.determineKeyIdentifier(puk);

	requestDAO.newRequest(holder, keyId, req.getBytes());

	return keyId;
}



/**
 * Return request for given keyId
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {ByteString} keyId the unique keyId of the request in the holder context
 * @type PKCS10
 * @return the request or null
 */
X509CertificateStore.prototype.getRequest = function(pathOrHolderId, keyId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getRequest(" + pathOrHolderId + "," + keyId + ")");

	var holder = this.getHolder(pathOrHolderId, true);

	var requestDAO = this.daof.getRequestDAO();
	var request = requestDAO.getRequestByKeyId(holder, keyId);

	var req = new PKCS10(request.bytes);
	return req;
}



/**
 * Store a certificate in the certificate store
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @param {X509} cert the certificate
 * @param {Boolean} makeCurrent true if this certificate becomes the current certificate
 * @param {Number} srId service request id to be stored with issued certificate (optional)
 * @type Certificate
 * @return the Certificate entry from the database or null
 */
X509CertificateStore.prototype.storeCertificate = function(pathOrHolderId, cert, makeCurrent, srId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "storeCertificate(" + pathOrHolderId + ",'" + cert + "'," + makeCurrent + ")");

	var holderdao = this.daof.getHolderDAO();

	if (typeof(pathOrHolderId) == "number") {
		var holder = holderdao.getHolderById(pathOrHolderId, this.certtype);
		if (holder == null) {
			throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate holder for id " + pathOrHolderId);
		}
	} else {
		var holder = holderdao.getHolder(pathOrHolderId, this.certtype);

		if (!holder) {
			GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found, creating new.");
			holder = holderdao.newHolder(pathOrHolderId, Holder.X509);
		}
	}

	var certdao = this.daof.getCertificateDAO();

	var issuer = cert.getIssuerDNString();
	var subject = cert.getSubjectDNString();
	var autid = cert.getAuthorityKeyIdentifier();
	var subid = cert.getSubjectKeyIdentifier();
	var serial = cert.getSerialNumber().toString(HEX);

	if ((autid && autid.equals(subid)) || issuer.equals(subject)) {
		dir = Certificate.SHORT;
	} else {
		dir = Certificate.UP;
	}

	var certificate = certdao.getCertificateBySerial(holder, serial, dir);

	if (certificate) {
		GPSystem.log(GPSystem.INFO, module.id, "storeCertificate() : We already have a different certificate for that serial number");
		GPSystem.log(GPSystem.INFO, module.id, "Existing: " + (new X509(certificate.bytes)));
		GPSystem.log(GPSystem.INFO, module.id, "New     : " + cert);

		return certificate;
	}

	var template = {
		keyId: PKIXCommon.determineKeyIdentifier(cert.getPublicKey()),
		expiry: new LongDate(cert.getNotAfter())
	};

	if (srId) {
		template.serviceRequestId = srId;
	}

	var certificate = certdao.newCertificate(holder, serial, dir, cert.getBytes(), template);

	if (makeCurrent || !holder.certId) {
		holderdao.updateCurrentCertificate(holder, certificate);
	}

	return certificate;
}



/**
 * Import a certificate that can be validated by one of certificates in the database.
 *
 * @param {X509} cert the certificate
 * @param {Boolean} makeCurrent true if this certificate becomes the current certificate
 * @param {Number} srId service request id to be stored with issued certificate (optional)
 * @type Certificate
 * @return the Certificate entry from the database or null
 */
X509CertificateStore.prototype.importCertificate = function(cert, makeCurrent, srId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "importCertificate(" + cert + ")");

	var issuer = cert.getIssuerDNString();
	var subject = cert.getSubjectDNString();
	if (issuer.equals(subject)) {
		throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "importCertificate can not import self-signed certificates");
	}

	var certdao = this.daof.getCertificateDAO();

	var autid = cert.getAuthorityKeyIdentifier();
	var subid = cert.getSubjectKeyIdentifier();

	var certdto = certdao.getCertificateByKeyId(autid);

	if (certdto == null) {
		GPSystem.log(GPSystem.WARN, module.id, "No certificate with AuthorityKeyIdentifier " + autid.toString(HEX) + " found");
		return null;
	}

	var ca = new X509(certdto.bytes);
	cert.verifyWith(ca);

	var parentId = certdto.holderId;
	var name = PKIXCommon.makeName(PKIXCommon.parseDN(subject));

	var holderdao = this.daof.getHolderDAO();
	var holder = holderdao.getHolderByTypeAndName(parentId, name, Holder.X509);

	if (!holder) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found, creating new.");
		holder = holderdao.newHolderForParent(parentId, Holder.X509, { name: name } );
	}

	var holderId = holder.id;

	return this.storeCertificate(holderId, cert, makeCurrent, srId);
}



/**
 * Get current key id
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @type ByteString
 * @return the current key id or null if none defined
 */
X509CertificateStore.prototype.getCurrentKeyIdAndCertificate = function(pathOrHolderId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCurrentKeyId(" + pathOrHolderId + ")");

	var holder = this.getHolder(pathOrHolderId, false);

	var certdao = this.daof.getCertificateDAO();

	var certificate = certdao.getCurrentCertificate(holder);

	if (!certificate) {
		return null;
	}

	return { keyId: certificate.keyId, certificate: new X509(certificate.bytes) };
}



/**
 * Get current certificate for given path or holderId
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @type X509
 * @return the current certificate or null if none defined
 */
X509CertificateStore.prototype.getCurrentCertificate = function(pathOrHolderId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCurrentCertificate(" + pathOrHolderId + ")");

	var holder = this.getHolder(pathOrHolderId, false);

	var certdao = this.daof.getCertificateDAO();

	var certificate = certdao.getCurrentCertificate(holder);

	if (!certificate) {
		return null;
	}

	return new X509(certificate.bytes);
}



/**
 * Get certificate chain for given path or holderId
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @type X509[]
 * @return the certificate chain, starting with the current certificate of the holder and ending with the self-signed trust anchor
 */
X509CertificateStore.prototype.getCertificateChain = function(pathOrHolderId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCertificateChain(" + pathOrHolderId + ")");

	var chain = [];
	var certdao = this.daof.getCertificateDAO();

	do	{
		var holder = this.getHolder(pathOrHolderId, false);

		var certificate = certdao.getCurrentCertificate(holder);

		if (!certificate) {
			throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "No current certificate found for " + holder);
		}

		chain.push(new X509(certificate.bytes));
		pathOrHolderId = holder.parentId;
	} while (pathOrHolderId != undefined);

	return chain;
}



/**
 * Get current certificate for given path or holderId
 *
 * @param {String/Number} pathOrHolderId the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1") or the holderId from the database
 * @type X509
 * @return the current certificate or null if none defined
 */
X509CertificateStore.prototype.getCurrentCertificateAndSigner = function(pathOrHolderId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCurrentCertificateAndSigner(" + pathOrHolderId + ")");

	var holder = this.getHolder(pathOrHolderId, false);

	var certdao = this.daof.getCertificateDAO();

	var certificate = certdao.getCurrentCertificate(holder);

	if (!certificate) {
		return null;
	}

	var cert = new X509(certificate.bytes);

	var signerDAO = this.daof.getSignerDAO();

	var signer = signerDAO.getSignerByKeyId(holder, certificate.keyId);

	if (!signer) {
		return null;
	}

	var prk = PKCS8.decodeKeyFromPKCS8Format(signer.keyblob);

	return { signerPrK: prk, signerCert: cert };
}
