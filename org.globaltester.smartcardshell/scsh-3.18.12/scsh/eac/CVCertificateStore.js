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
 * @fileoverview Support for a card verifiable certificates store according to EAC 1.1/2.0 using Data Access Objects
 */

// Imports
var CVC = require('scsh/eac/CVC').CVC;
var PublicKeyReference = require('scsh/eac/PublicKeyReference').PublicKeyReference;
var Certificate = require('scsh/pki-db/Certificate').Certificate;
var Holder = require('scsh/pki-db/Holder').Holder;
var PKCS8 = require('scsh/pkcs/PKCS8').PKCS8;

// Provided for backward compatibility in constructor
var DAOFactoryFileSystem    = require('scsh/pki-db/DAOFactoryFileSystem').DAOFactoryFileSystem;



/**
 * Create an object to access a certificate store.
 *
 * @class Class that abstracts a certificate and key store for a EAC PKI.
 *
 * @constructor
 * @param {DAOFactory} DAOFactory the factory that can create data access objects for persistent information
 */
function CVCertificateStore(daof) {
	assert(daof, "Parameter doaf can't be empty");

	if (typeof(daof) == "string") {
		daof = new DAOFactoryFileSystem(daof);
	}

	this.daof = daof;
	this.certtype = Holder.CVC;
}

exports.CVCertificateStore = CVCertificateStore;



/**
 * Check path
 *
 * This method validates the path for semantic errors and should be called for input
 * validation before using the path in the certificate store API.
 *
 * @param {String} path the path to validate
 */
CVCertificateStore.checkPath = function(path) {
	if ((path.indexOf("/..") >= 0) ||
		(path.indexOf("../") >= 0) ||
		(path.indexOf("\\..") >= 0) ||
		(path.indexOf("..\\") >= 0) ||
		(path.indexOf("\0") >= 0) ||
		(path.indexOf("~") >= 0)) {
		throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Path \"" + path + "\" contains illegal characters");
	}

	var pa = path.split("/");
	if ((pa.length < 2) || (pa.length > 4)) {
		throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Path must not contain less than one or more that three elements");
	}
	if (pa[0] != "") {
		throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Path must start with /");
	}
	for (var i = 1; i < pa.length; i++) {
		if ((pa[i].length < 3) || (pa[i].length > 11)) {
			throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Path element length must be between 3 and 11");
		}
	}
}



/**
 * Strip the last element of the path, effectively defining the parent within the path
 *
 * @param {String} path the path to strip the last element from
 * @returns the parent path or null for the root
 * @type String
 */
CVCertificateStore.parentPathOf = function(path) {
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
CVCertificateStore.nthElementOf = function(path, n) {
	var pe = path.substr(1).split("/");
	if (typeof(n) == "undefined") {
		return pe[pe.length - 1];
	}
	return pe[n];
}



/**
 * Set a context marker that goes into the certificate type
 *
 * The context marker allows to have different certificate stores with different
 * namespaces in the same database. The default context marker is 0.
 *
 * The context marker is stored with the Holder table.
 *
 * @param {Number} contextMarker the marker
 */
CVCertificateStore.prototype.setContextMarker = function(contextMarker) {
	this.certtype = (contextMarker << 4) + Holder.CVC;
}



/**
 * Return a suitable crypto object. This may be overwritten by derived classes
 *
 * @type Crypto
 * @return the Crypto object
 */
CVCertificateStore.prototype.getCrypto = function() {
	if (this.crypto == undefined) {
		this.crypto = new Crypto();
	}
	return this.crypto;
}



/**
 * Check if holder exists for path
 *
 * @param {String} path
 * @type Holder
 * @return true if holder exists
 * @private
 */
CVCertificateStore.prototype.hasHolder = function(path) {
	var holderdao = this.daof.getHolderDAO();

	var holder = holderdao.getHolder(path, this.certtype);
	return holder != null;
}



/**
 * List certificate holders for a given PKI element
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1")
 * @returns a list of holder ids, possibly empty
 * @type String[]
 */
CVCertificateStore.prototype.listHolders = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listHolders(" + path + ")");

	var holderdao = this.daof.getHolderDAO();

	var result = holderdao.getHolderList(path, this.certtype);
	return result;
}



/**
 * Get existing holder object for given path
 *
 * @param {String} path
 * @param {Boolean} create create if holder doesn't exist
 * @type Holder
 * @return the holder object
 * @private
 */
CVCertificateStore.prototype.getHolder = function(path, create) {
	var holderdao = this.daof.getHolderDAO();

	var holder = holderdao.getHolder(path, this.certtype);

	if (!holder) {
		if (!create) {
			throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate holder for " + path);
		}
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found, creating new.");
		holder = holderdao.newHolder(path, this.certtype);
	}

	return holder;
}



/**
 * Return the current CHR for which a valid certificate exists
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1")
 * @returns the current CHR for which a certificate exists or null if none exists
 * @type PublicKeyReference
 */
CVCertificateStore.prototype.getCurrentCHR = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCurrentCHR(" + path + ")");

	var holderdao = this.daof.getHolderDAO();

	var holder = holderdao.getHolder(path, this.certtype);

	if (!holder) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found");
		return null;
	}

	var certdao = this.daof.getCertificateDAO();

	var certificate = certdao.getCurrentCertificate(holder);
	if (!certificate) {
		GPSystem.log(GPSystem.DEBUG, module.id, "getCurrentCHR(" + path + ") : No current certificate");
		return null;
	}

	var cvc = new CVC(certificate.bytes);
	var chr = cvc.getCHR();
	GPSystem.log(GPSystem.DEBUG, module.id, "getCurrentCHR(" + path + ") : " + chr);
	return chr;
}



/**
 * Return the next CHR
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1")
 * @param {String} countryseq the 2 digit country code to include in the sequence number (optional)
 * @returns the next CHR based on the sequence counter maintained in the configuration file
 * @type PublicKeyReference
 */
CVCertificateStore.prototype.getNextCHR = function(path, countryseq) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getNextCHR(" + path + "," + countryseq + ")");

	var holderdao = this.daof.getHolderDAO();

	var holder = holderdao.getHolder(path, this.certtype);

	if (!holder) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found, creating new.");
		holder = holderdao.newHolder(path, this.certtype);
	}

	holderdao.updateSignerNo(holder, holder.signerNo + 1);

	return this.getCHRForSequenceNumber(path, holder.signerNo, countryseq);
}



/**
 * Set the new signer number, if it is larger than the current
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1")
 * @param {Number} signerNo the new signer number
 */
CVCertificateStore.prototype.setSignerNo = function(path, signerNo) {
	GPSystem.log(GPSystem.DEBUG, module.id, "setSignerNo(" + path + "," + signerNo + ")");

	var holderdao = this.daof.getHolderDAO();

	var holder = holderdao.getHolder(path, this.certtype);

	if (!holder) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found, creating new.");
		holder = holderdao.newHolder(path, this.certtype);
	}

	if (signerNo > holder.signerNo) {
		holderdao.updateSignerNo(holder, signerNo);
	}
}



/**
 * Generate key pair
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key pair
 * @param {Number} algo the key generation algorithm (Crypto.EC or Crypto.RSA)
 * @param {Key} prk the private key template
 * @param {Key} puk the public key template
 */
CVCertificateStore.prototype.generateKeyPair = function(path, chr, algo, prk, puk) {
	GPSystem.log(GPSystem.DEBUG, module.id, "generateKeyPair(" + path + "," + chr + ")");

	var holder = this.getHolder(path, false);

	var crypto = this.getCrypto();

	// Generate key pair
	crypto.generateKeyPair(algo, puk, prk);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.newSigner(holder, chr.toString(), chr.getBytes());

	var p8 = PKCS8.encodeKeyUsingPKCS8Format(prk);
	signerDAO.updateSignerKey(signer, p8);
}



/**
 * Get a private key in the certificate store
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key
 * @returns the private key or null if not found
 * @type Key
 */
CVCertificateStore.prototype.getPrivateKey = function(path, chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getPrivateKey(" + path + "," + chr + ")");

	var holder = this.getHolder(path, false);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.getSignerByKeyId(holder, chr.getBytes());

	if (!signer) {
		return null;
	}

	return PKCS8.decodeKeyFromPKCS8Format(signer.keyblob);
}



/**
 * Remove private key
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key
 * @returns true is deleted
 * @type boolean
 */
CVCertificateStore.prototype.deletePrivateKey = function(path, chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteRequest(" + path + "," + chr + ")");

	var holder = this.getHolder(path, true);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.getSignerByName(holder, chr.toString());

	if (!signer) {
		return false;
	}

	return signerDAO.deleteSigner(signer);
}



/**
 * Create Signer
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key pair
 * @param {Number} algo the key generation algorithm (Crypto.EC or Crypto.RSA)
 * @param {Key} prk the private key template
 * @param {Key} puk the public key template
 */
CVCertificateStore.prototype.newSigner = function(path, chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newSigner(" + path + "," + chr + ")");

	var holder = this.getHolder(path, false);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.newSigner(holder, chr.toString(), chr.getBytes());
}



/**
 * Get Signer
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key
 * @returns the private key blob
 * @type ByteString
 */
CVCertificateStore.prototype.getSigner = function(path, chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSigner(" + path + "," + chr + ")");

	if (!this.hasHolder(path)) {
		return null;
	}

	var holder = this.getHolder(path, false);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.getSignerByKeyId(holder, chr.getBytes());

	if (!signer) {
		return null;
	}

	var blob = signer.keyblob;
	if (!blob) {
		blob = new ByteString("", HEX);
	}

	return blob;
}



/**
 * Remove Signer
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key
 * @returns true is deleted
 * @type boolean
 */
CVCertificateStore.prototype.deleteSigner = function(path, chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteSigner(" + path + "," + chr + ")");

	var holder = this.getHolder(path, true);

	var signerDAO = this.daof.getSignerDAO();
	var signer = signerDAO.getSignerByName(holder, chr.toString());

	if (!signer) {
		return false;
	}

	return signerDAO.deleteSigner(signer);
}



/**
 * Store a certificate request in the certificate store
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {CVC} req the request
 */
CVCertificateStore.prototype.storeRequest = function(path, req) {
	GPSystem.log(GPSystem.DEBUG, module.id, "storeRequest(" + path + "," + req + ")");

	var chr = req.getCHR();

	var holder = this.getHolder(path, true);

	var requestDAO = this.daof.getRequestDAO();
	requestDAO.newRequest(holder, chr.getBytes(), req.getBytes());
}



/**
 * Return request for given CHR
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for the certificate
 * @type CVC
 * @return the request or null
 */
CVCertificateStore.prototype.getRequest = function(path, chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getRequest(" + path + "," + chr + ")");

	var holder = this.getHolder(path, true);

	var requestDAO = this.daof.getRequestDAO();
	var request = requestDAO.getRequestByKeyId(holder, chr.getBytes());

	if (!request) {
		return null;
	}

	var req = new CVC(request.bytes);
	return req;
}



/**
 * Remove request
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this request
 * @returns true is deleted
 * @type boolean
 */
CVCertificateStore.prototype.deleteRequest = function(path, chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteRequest(" + path + "," + chr + ")");

	var holder = this.getHolder(path, true);

	var requestDAO = this.daof.getRequestDAO();
	var request = requestDAO.getRequestByKeyId(holder, chr.getBytes());

	if (!request) {
		return false;
	}

	return requestDAO.deleteRequest(request);
}



/**
 * Store a certificate in the certificate store
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {CVC} cert the certificate
 * @param {Boolean} makeCurrent true if this certificate become the current certificate
 */
CVCertificateStore.prototype.storeCertificate = function(path, cert, makeCurrent) {
	GPSystem.log(GPSystem.DEBUG, module.id, "storeCertificate(" + path + ",'" + cert + "'," + makeCurrent + ")");

	var holderdao = this.daof.getHolderDAO();

	var holder = holderdao.getHolder(path, this.certtype);

	if (!holder) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found, creating new.");
		holder = holderdao.newHolder(path, this.certtype);
	}

	var certdao = this.daof.getCertificateDAO();

	var car = cert.getCAR();
	var chr = cert.getCHR();
	var dir = Certificate.UP;

	if (car.equals(chr)) {
		dir = Certificate.SHORT;
	}

	var certificate = certdao.getCertificateBySerial(holder, chr.toString(), dir);

	if (certificate) {
		var ecvc = new CVC(certificate.bytes);

		GPSystem.log(GPSystem.INFO, module.id, "storeCertificate() : We already have a certificate for that serial number");
		GPSystem.log(GPSystem.INFO, module.id, "Existing: " + ecvc);
		GPSystem.log(GPSystem.INFO, module.id, "New     : " + cert);
		GPSystem.log(GPSystem.INFO, module.id, "Both are " + (cert.getBytes().equals(certificate.bytes) ? "identical" : "different"));

		if (ecvc.getCAR().equals(ecvc.getCHR()) && (dir == Certificate.UP)) {
			GPSystem.log(GPSystem.INFO, module.id, "This is an additional link certificate for an existing root certificate");
		} else {
			return;
		}
	}

	var template = {
		keyId: chr.getBytes()
	};

	var certificate = certdao.newCertificate(holder, chr.toString(), dir, cert.getBytes(), template);

	if (makeCurrent) {
		holderdao.updateCurrentCertificate(holder, certificate);
	}
}



/**
 * Return certificate for a given CHR in binary format
 *
 * <p>This method returns a self-signed root certificate if the selfsigned
 *    parameter is set. If not set or set to false, then matching link certificate,
 *    if any, is returned rather than the self-signed certificate.</p>
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for the certificate
 * @param {boolean} selfsigned return the self-signed root certificate rather than a link certificate
 * @returns the certificate or null if not found
 * @type ByteString
 */
CVCertificateStore.prototype.getCertificateBinary = function(path, chr, selfsigned) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCertificateBinary(" + path + "," + chr + "," + selfsigned + ")");

	var holderdao = this.daof.getHolderDAO();

	var holder = holderdao.getHolder(path, this.certtype);

	if (!holder) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder at " + path + " not found");
		return null;
	}

	var certificateDAO = this.daof.getCertificateDAO();

	var certificate = certificateDAO.getCertificateBySerial(holder, chr.toString(), selfsigned ? Certificate.SHORT : Certificate.UP );

	if (!certificate) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Certificate for " + chr.toString() + " not found");
		return null;
	}

	GPSystem.log(GPSystem.DEBUG, module.id, "getCertificateBinary:" + certificate.bytes.bytes(0,10).toString(HEX));
	return certificate.bytes;
}



/**
 * Return certificate for a given CHR
 *
 * <p>This method returns a self-signed root certificate if the selfsigned
 *    parameter is set. If not set or set to false, then matching link certificate,
 *    if any, is returned rather than the self-signed certificate.</p>
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for the certificate
 * @param {boolean} selfsigned return the self-signed root certificate rather than a link certificate
 * @returns the certificate or null if not found
 * @type CVC
 */
CVCertificateStore.prototype.getCertificate = function(path, chr, selfsigned) {
	var bin = this.getCertificateBinary(path, chr, selfsigned);

	if (bin == null) {
		return null;
	}

	var cvc = null;
	try	{
		cvc = new CVC(bin);
	}
	catch (e) {
		GPSystem.log(GPSystem.ERROR, module.id, e);
	}
	return cvc;
}



/**
 * Try locating a certificate with the given CHR
 *
 * This method tries to find a specific certificate in the store, irrespectively of the holder.
 *
 * @param {PublicKeyReference} chr the public key reference for the certificate
 * @returns the certificate or null if none found or more than one found
 * @type CVC
 */
CVCertificateStore.prototype.locateCertificate = function(chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "locateCertificate(" + chr + ")");

	var certificateDAO = this.daof.getCertificateDAO();

	if (typeof(certificateDAO.getCertificateBySerialAndType) == "undefined") {
		return null;
	}

	var certificate = certificateDAO.getCertificateBySerialAndType(chr.toString(), this.certtype);

	if (!certificate) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Certificate for " + chr.toString() + " not found or not unique");
		return null;
	}

	cvc = new CVC(certificate.bytes);
	return cvc;
}



/**
 * Remove certificate
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this certificate
 * @param {boolean} selfsigned delete the self-signed root certificate rather than a link certificate
 * @returns true is deleted
 * @type boolean
 */
CVCertificateStore.prototype.deleteCertificate = function(path, chr, selfsigned) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteCertificate(" + path + "," + chr + "," + selfsigned + ")");

	var holder = this.getHolder(path, false);

	if (!holder) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found");
		return null;
	}

	var certificateDAO = this.daof.getCertificateDAO();

	var certificate = certificateDAO.getCertificateBySerial(holder, chr.toString(), selfsigned ? Certificate.SHORT : Certificate.UP );

	if (!certificate) {
		return false;
	}
	return certificateDAO.deleteCertificate(certificate);
}



/**
 * Return a chain of certificates resembling a path from root to end entity.
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} tochr the public key reference for the certificate at the end of the chain
 * @param {PublicKeyReference} fromcar the public key reference for the certificate to start with or root if undefined
 * @returns the list of certificates starting with a self signed root certificate (fromcar undefined) a certificate
 *          issued by fromcar up to an including the certificate referenced by tochr. Return null if fromcar is not found.
 * @type CVC[]
 */
CVCertificateStore.prototype.getCertificateChain = function(path, tochr, fromcar) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCertificateChain(" + path + "," + tochr + "," + fromcar + ")");

	var chain = [];
	var chr = tochr;

	while (true) {
		var cvc = this.getCertificate(path, chr, false);
		if (cvc == null) {
			throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate certificate " + chr);
		}
		chain.push(cvc);
		if (typeof(fromcar) == "undefined") {
			if (cvc.getCAR().equals(cvc.getCHR())) {
				break;
			}
		} else {
			if (cvc.getCAR().equals(fromcar)) {
				break;
			}
			if (cvc.getCAR().equals(cvc.getCHR())) {
				return null;	// fromcar not found along the chain
			}
		}
		var ofs = path.lastIndexOf("/");
		if (ofs > 0) {
			path = path.substr(0, ofs);
		}
		chr = cvc.getCAR();
	}

	return chain.reverse();
}



/**
 * List certificates stored for given PKI element sorted by CHR
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @returns a list of certificates, possibly empty
 * @type CVC[]
 */
CVCertificateStore.prototype.listCertificates = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listCertificates(" + path + ")");

	var result = [];

	var holder = this.getHolder(path, true);

	var certificateDAO = this.daof.getCertificateDAO();

	var certificates = certificateDAO.enumerateCertificates(holder);

	if (!certificates) {
		GPSystem.log(GPSystem.DEBUG, module.id, "No certificates found");
		return result;
	}

	for (var i = 0; i < certificates.length; i++) {
		var cvc = new CVC(certificates[i].bytes);
		result.push(cvc);
	}

	result.sort(function(a,b) { return a.getCHR().toString() < b.getCHR().toString() ? -1 : (a.getCHR().toString() > b.getCHR().toString() ? 1 : 0) } );
	GPSystem.log(GPSystem.DEBUG, module.id, "listCertificates:" + result.length);
	return result;

}



/**
 * Returns the domain parameter for a certificate identified by its CHR
 *
 * <p>This method traverses the certificate hierachie upwards and follows link certificates
 *    until domain parameter are found.</p>
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1")
 * @param {PublicKeyReference} chr the CHR of the certificate to start the search with
 * @return the domain parameter
 * @type Key
 */
CVCertificateStore.prototype.getDomainParameter = function(path, chr) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getDomainParameter(" + path + "," + chr + ")");

	if (typeof(chr) == "undefined") {	// ToDo remove after migration
		chr = path;
		var path = "/" + chr.getHolder();
	}

	do	{
		var ofs = path.lastIndexOf("/");
		if (ofs > 0) {
			var cvc = this.getCertificate(path, chr);
			if (cvc == null) {
				throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate certificate " + chr);
			}
			chr = cvc.getCAR();
			path = path.substr(0, ofs);
		}
	} while (ofs > 0);

	do {
		var cvc = this.getCertificate(path, chr);

		if (cvc == null) {
			throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate certificate " + chr + " in " + path);
		}

		var p = cvc.getPublicKey();
		if (typeof(p.getComponent(Key.ECC_P)) != "undefined") {
			return p;
		}
		chr = cvc.getCAR();
	} while (!chr.equals(cvc.getCHR()));

	throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate CVCA certificate with domain parameter");
}



/**
 * Returns the default domain parameter for a given PKI
 *
 * @param {String} path the PKI path (e.g. "/UTCVCA1/UTDVCA1/UTTERM"). Only the first path element is relevant
 * @return the domain parameter
 * @type Key
 */
CVCertificateStore.prototype.getDefaultDomainParameter = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getDefaultDomainParameter(" + path + ")");

	var pe = path.substr(1).split("/");
	chr = this.getCurrentCHR("/" + pe[0]);
	if (chr == null) {
		throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate current CVCA certificate");
	}
	return this.getDomainParameter(chr);
}



/**
 * Returns the default algorithm identifier OID from the most recent link certificate
 *
 * @param {String} path the PKI path (e.g. "/UTCVCA1/UTDVCA1/UTTERM"). Only the first path element is relevant
 * @return the algorithm identifier
 * @type ByteString
 */
CVCertificateStore.prototype.getDefaultPublicKeyOID = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getDefaultPublicKeyOID(" + path + ")");

	var pe = path.substr(1).split("/");
	chr = this.getCurrentCHR("/" + pe[0]);
	if (chr == null) {
		throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate current CVCA certificate");
	}
	var cvc = this.getCertificate("/" + pe[0], chr);
	if (cvc == null) {
		throw new GPError(module.id, GPError.INVALID_ARGUMENTS, 0, "Could not locate current CVCA certificate");
	}

	return cvc.getPublicKeyOID();
}



/**
 * Encode a three character alpha-numeric sequence number
 *
 * <p>This function encodes values in the range 0 to 999 as numeric string with leading zeros.</p>
 * <p>Value in the range 1000 to 34695 (999 + 26 * 36 * 36) are encoded as alphanumeric string.</p>
 * <p>Value beyond 34696 are truncated</p>
 *
 * @param {Number} value integer sequence value
 * @type String
 * @return the 3 character string
 * @private
 */
CVCertificateStore.encodeBase36 = function(value) {
	value = value % (1000 + 26 * 36 * 36);
	var seq;
	if (value < 1000) {
		seq = "" + value;
	} else {
		value += 11960;			10 * 36 * 36 - 1000
		seq = "";
		while(value > 0) {
			var c = value % 36;
			if (c >= 10) {
				c += 55;
			} else {
				c += 48;
			}
			seq = String.fromCharCode(c) + seq;
			value = Math.floor(value / 36);
		}
	}
	seq = "000".substr(0, 3 - seq.length) + seq;
	return seq;
}



/**
 * Create a CHR for the given path and sequence number
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1")
 * @param {Number} the sequence number to be translated
 * @param {String} countryseq the 2 digit country code to include in the sequence number (optional)
 * @return the CHR
 * @type PublicKeyReference
 * @private
 */
CVCertificateStore.prototype.getCHRForSequenceNumber = function(path, sequence, countryseq) {
	var pe = path.substr(1).split("/");
	var l = pe[pe.length - 1];

	var str;
	if (countryseq) {
		str = countryseq + CVCertificateStore.encodeBase36(sequence);
	} else {
		str = "" + sequence;
		str = "0000".substr(4 - (5 - str.length)).concat(str);
	}
	return new PublicKeyReference(l + str);
}



/**
 * Determine path for certificate issuer
 *
 * For CVCA and DVCA certificates we can determined the path from the CAR. For Terminal
 * certificates we dont know the full path, as we don't know under which CVCA the DVCA operates
 * that issued the Terminal certificate. So we use a two-step heuristic which first tries to locate
 * the DVCA certificate based on the CAR and if that is not unique uses the cvcahint to determine the path
 * of the issuer
 */
CVCertificateStore.prototype.getIssuerPathFor = function(cvc, cvcahint) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getIssuerPathFor('" + cvc + "'," + cvcahint + ")");

	var car = cvc.getCAR();
	var level = cvc.getLevel();

	if (level != 3) {
		var path = "/" + car.getHolder();
	} else {
		var cacert = this.locateCertificate(car);
		if (cacert) {
			path = "/" + cacert.getCAR().getHolder() + "/" + car.getHolder();
			GPSystem.log(GPSystem.DEBUG, module.id, "getIssuerPathFor() using path based on located issuer certificate " + path);
		} else {
			path = "/" + CVCertificateStore.nthElementOf(cvcahint, 0) + "/" + car.getHolder();
			GPSystem.log(GPSystem.DEBUG, module.id, "getIssuerPathFor() using path based on hint " + path);
		}
	}

	return path;
}



/**
 * Validate a certificate against a certificate already stored in the certificate store
 *
 * <p>If the certificate is a terminal certificate, then the first element of the path given
 *    in cvcahint is used to determine the correct CVCA.</p>
 *
 * Throws an exception if the certificate can not be validated
 *
 * @param {Crypto} crypto the crypto provider to be used for certificate verification
 * @param {CVC} cvc the certificate
 * @param {String} cvcahint the PKI path (e.g. "/UTCVCA1/UTDVCA1/UTTERM"). Only the first path element is relevant
 * @returns object containing the path and domain parameter used for validating the certificate. Returns null if no issuer could be found
 * @type Object
 */
CVCertificateStore.prototype.validateCertificate = function(crypto, cvc, cvcahint) {
	GPSystem.log(GPSystem.DEBUG, module.id, "validateCertificate('" + cvc + "'," + cvcahint + ")");

	var car = cvc.getCAR();
	var level = cvc.getLevel();

	if (car.equals(cvc.getCHR())) { // Self signed
		if (level != 1) {
			GPSystem.log(GPSystem.ERROR, module.id, "Self-signed certificates only allowed for CVCA: " + cvc);
			throw new GPError(module.id, GPError.CRYPTO_FAILED, 0, "Self-signed certificates only allowed for CVCA: " + cvc);
		}
		if (!cvc.verifyWith(crypto, cvc.getPublicKey(), cvc.getPublicKeyOID())) {
			GPSystem.log(GPSystem.ERROR, module.id, "Self-signed certificate failed signature verification. " + cvc);
			throw new GPError(module.id, GPError.CRYPTO_FAILED, 0, "Self-signed certificate failed signature verification. " + cvc);
		}
		return;
	}

	var path = this.getIssuerPathFor(cvc, cvcahint);
	var cacert = this.getCertificate(path, car);

	if (cacert == null) {
		GPSystem.log(GPSystem.ERROR, module.id, "Can't find issuer " + car);
		return;
	}

	var oid = cacert.getPublicKeyOID();
	if (CVC.isECDSA(oid)) {
		var dp = this.getDomainParameter(path, car);
	} else {
		var dp = null;
	}
	var result = cvc.verifyWith(crypto, cacert.getPublicKey(dp), oid);
	if (!result) {
		GPSystem.log(GPSystem.ERROR, module.id, "Certificate " + cvc + " failed signature verification with " + cacert);
		throw new GPError(module.id, GPError.CRYPTO_FAILED, 0, "Certificate " + cvc + " failed signature verification with " + cacert);
	}

	return { path: path + "/" + cvc.getCHR().getHolder(), dp: dp };
}



/**
 * Insert a single certificates into the certificate store
 *
 * <p>Before a certificate is imported, the signature is verified.</p>
 * <p>If the certificate is a terminal certificate, then the first element of the path given
 *    in cvcahint is used to determine the correct CVCA.</p>
 *
 * @param {Crypto} crypto the crypto provider to be used for certificate verification
 * @param {CVC} cvc the certificate
 * @param {String} cvcahint the PKI path (e.g. "/UTCVCA1/UTDVCA1/UTTERM"). Only the first path element is relevant
 * @returns true, if the certificate was inserted
 * @type boolean
 */
CVCertificateStore.prototype.insertCertificate = function(crypto, cvc, cvcahint) {
	GPSystem.log(GPSystem.DEBUG, module.id, "insertCertificate('" + cvc + "'," + cvcahint + ")");

	var car = cvc.getCAR();
	var path = this.getIssuerPathFor(cvc, cvcahint);

	var cacert = this.getCertificate(path, car);
	if (cacert == null) {
		GPSystem.log(GPSystem.ERROR, module.id, "Can't find issuer " + car);
		return false;
	}

	if (CVC.isECDSA(cacert.getPublicKeyOID())) {
		var dp = this.getDomainParameter(path, car);
	} else {
		var dp = null;
	}
	var result = cvc.verifyWith(crypto, cacert.getPublicKey(dp), cacert.getPublicKeyOID());
	if (!result) {
		GPSystem.log(GPSystem.ERROR, module.id, "Certificate " + cvc + " failed signature verification with " + cacert);
		return false;
	}

	var chr = cvc.getCHR();
	var holder = chr.getHolder();

	if (holder == car.getHolder()) {	// Link certificate
		this.storeCertificate("/" + holder, cvc, true);
	} else {							// Subordinate certificate
		this.storeCertificate(path + "/" + holder, cvc, true);
	}

	return true;
}



/**
 * Insert certificates into certificate store
 *
 * <p>The import into the internal data structure is done in three steps:</p>
 * <ol>
 *  <li>If allowed, all self-signed certificates are imported</li>
 *  <li>All possible certificate chains are build</li>
 *  <li>Certificate chains are processed starting with the topmost certificate in the hierachie</li>
 * </ol>
 * <p>Certificates at the terminal level can only be imported, if the issuing
 *    DVCA certificate is contained in the list or a hint for the relevant CVCA is
 *    given in the first element of the path contained in parameter cvcahint.</p>
 * <p>Before a certificate is imported, the signature is verified.</p>
 *
 * @param {Crypto} crypto the crypto provider to be used for certificate verification
 * @param {CVC[]} certlist the unordered list of certificates
 * @param {Boolean} insertSelfSigned true, if the import of root certificates is allowed
 * @param {String} cvcahint the PKI path (e.g. "/UTCVCA1/UTDVCA1/UTTERM"). Only the first path element is relevant
 * @returns the (ideally empty) list of unprocessed certificates. This does not contains certificates
 *          that fail signature verification.
 * @type CVC[]
 */
CVCertificateStore.prototype.insertCertificates = function(crypto, certlist, insertSelfSigned, cvcahint) {
	GPSystem.log(GPSystem.DEBUG, module.id, "insertCertificates('" + certlist + "'," + insertSelfSigned + "," + cvcahint + ")");

	var chrmap = [];

	// Iterate certificate list and store self-signed certificates, if allowed
	// Generate a map of certificate holder references
	var unprocessed = [];
	for (var i = 0; i < certlist.length; i++) {
		var cvc = certlist[i];
		var chr = cvc.getCHR().toString();

		if (chr == cvc.getCAR().toString()) { // Self signed
			var result = cvc.verifyWith(crypto, cvc.getPublicKey(), cvc.getPublicKeyOID());

			if (result) {
				var path = "/" + cvc.getCHR().getHolder();
				if (insertSelfSigned) {		// Store self-signed certificates
					this.storeCertificate(path, cvc, true);
				}
			} else {
				GPSystem.log(GPSystem.ERROR, module.id, "Self-signed certificate failed signature verification. " + cvc);
			}
		} else {
			var state = { cvc: cvc, end: true, stored: false };
			unprocessed.push(state);
			if (typeof(chrmap[chr]) == "undefined") {
				chrmap[chr] = state;
			} else {
				// Duplicate CHRs for terminals are allowed
				chrmap[cvc.getCAR().toString() + "/" + chr] = state;
			}
		}
	}

	// Mark certificates that are surely CAs, because an issued certificate is contained in the list
	certlist = unprocessed;
	for (var i = 0; i < certlist.length; i++) {
		var cvc = certlist[i].cvc;
		var state = chrmap[cvc.getCAR().toString()];
		if (typeof(state) != "undefined") {
			GPSystem.log(GPSystem.DEBUG, module.id, "Mark as CA: " + state.cvc);
			state.end = false;
		}
	}

	var unprocessed = [];
	for (var i = 0; i < certlist.length; i++) {
		var state = certlist[i];
		if (state.end) {		// Find all certificates which are at the end of the chain
			var list = [];
			var lastpathelement = state.cvc.getCHR().getHolder();
			var path = "/" + lastpathelement;
			var singlecert = true;
			while(true)	{		// Build a certificate chain and the path for the last certificate
				var pathelement = state.cvc.getCAR().getHolder();
				if (pathelement != lastpathelement) {		// CVCA Link Certificates don't add to the path
					path = "/" + pathelement + path;
				}
				lastpathelement = pathelement;

				if (!state.stored) {			// If not already stored, add to the list
					list.push(state);
					state.stored = true;
				}
				state = chrmap[state.cvc.getCAR().toString()];
				if (typeof(state) == "undefined") {
					break;
				}
				singlecert = false;
			}
			if (singlecert && cvcahint) {
				GPSystem.log(GPSystem.DEBUG, module.id, "Single certificate might be a terminal certificate, using cvca hint " + cvcahint);
				path = cvcahint;
			} else {
				GPSystem.log(GPSystem.DEBUG, module.id, "Path is " + path);
			}
			for (var j = list.length - 1; j >= 0; j--) {	// Process chain in reverse order
				var cvc = list[j].cvc;
				if (!this.insertCertificate(crypto, cvc, path)) {
					unprocessed.push(cvc);
				}
			}
		}
	}

	return unprocessed;
}
// For backward compatibility
CVCertificateStore.prototype.insertCertificates2 = CVCertificateStore.prototype.insertCertificates;
