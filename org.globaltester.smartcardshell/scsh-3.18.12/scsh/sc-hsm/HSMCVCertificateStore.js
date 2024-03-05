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
 * @fileoverview A card verifiable certificate store using a SmartCard-HSM as key store
 */

// Imports

PublicKeyReference	 = require('scsh/eac/PublicKeyReference').PublicKeyReference;
CVC			 = require('scsh/eac/CVC').CVC;
CVCertificateStore	 = require('scsh/eac/CVCertificateStore').CVCertificateStore;
SmartCardHSM		 = require('scsh/sc-hsm/SmartCardHSM').SmartCardHSM;
SmartCardHSMKey		 = require('scsh/sc-hsm/SmartCardHSM').SmartCardHSMKey;
CVCCA			 = require('scsh/eac/CVCCA').CVCCA;



/**
 * Create a CV certificate store using a SmartCard-HSM as secure key store
 *
 * @class CV certificate store with SmartCard-HSM as secure key store
 * @constructor
 * @param {DAOFactory} daof the factory that can create data access objects for persistent information
 * @param {SmartCardHSM} sc the SmartCard-HSM access object
 */
function HSMCVCertificateStore(daof, sc) {
	CVCertificateStore.call(this, daof);
	if (sc) {
		this.sc = sc;
		sc.enumerateKeys();
	}
}

HSMCVCertificateStore.prototype = Object.create(CVCertificateStore.prototype);
HSMCVCertificateStore.constructor = HSMCVCertificateStore;

exports.HSMCVCertificateStore = HSMCVCertificateStore;



HSMCVCertificateStore.prototype.setSmartCardHSM = function(sc) {
	this.sc = sc;
	sc.enumerateKeys();
}



/**
 * Get crypto object
 *
 * @type HSMCrypto
 * @return the HSMCrypto object
 */
HSMCVCertificateStore.prototype.getCrypto = function() {
	if (this.sc) {
		return this.sc.getCrypto();
	}
	return new Crypto();
}



/**
 * Transform path and certificate holder into a label
 *
 * @param {String} path the path
 * @param {PublicKeyReference} chr the certificate holder reference
 * @type String
 * @return the key label
 */
HSMCVCertificateStore.path2label = function(path, chr) {
	return path.substr(1) + chr.getSequenceNo();
}



/**
 * Get a private key in the certificate store. Overrides method in CVCertificateStore.
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key
 * @returns the private key or null if not found
 * @type Key
 */
HSMCVCertificateStore.prototype.getPrivateKey = function(path, car) {
	var label = HSMCVCertificateStore.path2label(path, car);
	print("Get private key " + label);

	return this.sc.getKey(label);
}



/**
 * Generate a certificate request using a private key in the SmartCard-HSM
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1")
 * @param {PublicKeyReference} car the CA at which this request is addressed
 * @param {boolean} forceInitial force an initial request, even if a current certificate is available
 * @param {boolean} signinitial sign with initial key (sequence = 00000)
 * @param {Key} keyspec a key object containing key parameters (e.g. EC Curve)
 * @param {ByteString} algo the terminal authentication algorithm object identifier
 * @return the certificate request
 * @type CVC
 */
HSMCVCertificateStore.prototype.generateRequest = function(path, car, forceinitial, signinitial, keyspec, algo, countryseq) {

	// Determine CHR
	var currentchr = this.getCurrentCHR(path);
	var nextchr = this.getNextCHR(path, countryseq);
	var label = HSMCVCertificateStore.path2label(path, nextchr);

	if (car == null) {			// CAR is not optional in SmartCard-HSM generated requests
		car = nextchr;			// Use the CHR if no CAR defined.
	}

	var signkid = 0;
	if ((currentchr != null) && !forceinitial) {
		var curlabel = HSMCVCertificateStore.path2label(path, currentchr);
		var key = this.sc.getKey(curlabel);
		if (key == null) {
			throw new GPError("HSMCVCertificateStore", GPError.DEVICE_ERROR, 0, "Key " + curlabel + " not found");
		}
		var signkid = key.getId();
		var outerCAR = currentchr;
	}

	var key = this.sc.getKey(label);
	if (key) {
		var newkid = key.getId();
	} else {
		var newkid = this.sc.determineFreeKeyId();
	}

	if (typeof(keyspec.getComponent(Key.ECC_P)) != "undefined") {
		var keysize = keyspec.getSize();
		print("1:Keysize " + keysize);
		if (keysize < 0) {
			var keysize = keyspec.getComponent(Key.ECC_P).length << 3;
			print("2:Keysize " + keysize);
		}
		var keydata = SmartCardHSM.buildGAKPwithECC(car, algo, nextchr, keyspec, outerCAR);
		var keydesc = SmartCardHSM.buildPrkDforECC(newkid, label, keysize);
	} else {
		var keydata = SmartCardHSM.buildGAKPwithRSA(car, algo, nextchr, keyspec.getSize(), outerCAR);
		var keydesc = SmartCardHSM.buildPrkDforRSA(newkid, label, keyspec.getSize());
	}

	var reqbin = this.sc.generateAsymmetricKeyPair(newkid, signkid, keydata);

	var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + newkid);
	this.sc.updateBinary(fid, 0, keydesc.getBytes());

	if (((currentchr == null) || forceinitial) && !signinitial) {
		var a = new ASN1(reqbin);
		a = a.get(0);
		var req = new CVC(a.getBytes());
	} else {
		var req = new CVC(reqbin);
	}

	var hkey = new SmartCardHSMKey(this.sc, newkid);
	hkey.setDescription(keydesc);
	this.sc.addKeyToMap(hkey);

	return req;
}



/**
 * Get a private key in the certificate store. Overrides method in CVCertificateStore.
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key
 * @returns the private key or null if not found
 * @type Key
 */
HSMCVCertificateStore.prototype.deletePrivateKey = function(path, car) {
	var label = HSMCVCertificateStore.path2label(path, car);
	print("Get private key " + label);

	return this.sc.getKey(label);
}



HSMCVCertificateStore.testPath = GPSystem.mapFilename("testca", GPSystem.CWD);

HSMCVCertificateStore.test = function() {
	var card = new Card(_scsh3.reader);

	var sc = new SmartCardHSM(card);
	sc.verifyUserPIN(new ByteString("648219", ASCII));
	var cs = new HSMCVCertificateStore(HSMCVCertificateStore.testPath + "/cvca", sc);

	var crypto = sc.getCrypto();

	var cvca = new CVCCA(crypto, cs, null, null, "/UTCVCA");

	// Create a new request
	var car = new PublicKeyReference("UTCVCA00000");

	var req = cvca.generateRequest(car, false);
	print("Request: " + req);
	print(req.getASN1());

	assert(req.verifyWith(crypto, req.getPublicKey()));

	// Create self-signed or link certificate based on request
	var policy = { certificateValidityDays: 2,
				   chatRoleOID: new ByteString("id-IS", OID),
				   chatRights: new ByteString("E3", HEX),
				   includeDomainParameter: true,
				   extensions: []
				 };
	var cert = cvca.generateCertificate(req, policy);
	print("Certificate: " + cert);
	print(cert.getASN1());

	// Import certificate into store, making it the most current certificate
	cvca.storeCertificate(cert);

	// Generate additional self-signed root certificate
	// This must be done after the link certificate has been imported
	var policy = { certificateValidityDays: 2,
				   chatRoleOID: new ByteString("id-IS", OID),
				   chatRights: new ByteString("E3", HEX),
				   includeDomainParameter: true,
				   extensions: []
				 };
	var cert = cvca.generateCertificate(req, policy);
	print("Certificate: " + cert);
	print(cert.getASN1());

	// Import certificate into store, making it the most current certificate
	cvca.storeCertificate(cert);
}
