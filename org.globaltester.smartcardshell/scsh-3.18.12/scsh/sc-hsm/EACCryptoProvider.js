/**
 *  ---------
 * |.##> <##.|  SmartCard-HSM Support Scripts
 * |#       #|
 * |#       #|  Copyright (c) 2011-2016 CardContact Systems GmbH
 * |'##> <##'|  Schuelerweg 38, 32429 Minden, Germany (www.cardcontact.de)
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
 * @fileoverview SmartCard-HSM Crypto Provider for EAC-PKI
 */

var CVC					= require('scsh/eac/CVC').CVC;
var PublicKeyReference			= require('scsh/eac/PublicKeyReference').PublicKeyReference;
var SmartCardHSM			= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSM;
var SmartCardHSMKey			= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSMKey;
var SmartCardHSMKeySpecGenerator	= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSMKeySpecGenerator;



/**
 * Crypto Provider for EAC-PKI
 *
 * @param {SmartCardHSM} sc the associated SmartCard-HSM
 */
function EACCryptoProvider(sc, id) {
	this.sc = sc;
	this.id = id;
	sc.enumerateKeys();
}

exports.EACCryptoProvider = EACCryptoProvider;

EACCryptoProvider.CVCCACERTIFICATEPREFIX = 0xD0;
EACCryptoProvider.PATH_EF_FID = 0xD100;



/**
 * Replace SmartCard-HSM
 *
 * @param {SmartCardHSM} sc the new SmartCard-HSM
 */
EACCryptoProvider.prototype.setSmartCardHSM = function(sc) {
	this.sc = sc;
	sc.enumerateKeys();
}



/**
 * Get crypto object
 *
 * This method is part of the API.
 *
 * @type HSMCrypto
 * @return the HSMCrypto object
 */
EACCryptoProvider.prototype.getCrypto = function() {
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
EACCryptoProvider.path2label = function(path, chr) {
	return path.substr(1) + chr.getSequenceNo();
}



/**
 * Get a handle for a private key stored on the SmartCard-HSM
 *
 * This method is part of the API.
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key
 * @param {ByteString} blob the optional key blob
 * @returns the private key or null if not found
 * @type Key
 */
EACCryptoProvider.prototype.getPrivateKey = function(path, chr, blob) {
	var label = EACCryptoProvider.path2label(path, chr);
	GPSystem.log(GPSystem.DEBUG, module.id, "Get private key " + label);

	return this.sc.getKey(label);
}



/**
 * Delete private key from SmartCard-HSM
 *
 * This method is part of the API.
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1/UTTERM")
 * @param {PublicKeyReference} chr the public key reference for this key
 */
EACCryptoProvider.prototype.deletePrivateKey = function(path, chr) {
	var label = EACCryptoProvider.path2label(path, chr);
	GPSystem.log(GPSystem.DEBUG, module.id, "Delete private key " + label);
	var key = this.sc.getKey(label);
	if (!key) {
		return;
	}

	var kid = key.getId();
	var fid = ByteString.valueOf((SmartCardHSM.KEYPREFIX << 8) + kid);
	this.sc.deleteFile(fid);

	try	{
		var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + kid);
		this.sc.deleteFile(fid);

		var fid = ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + kid);
		this.sc.deleteFile(fid);
	}
	catch(e) {
		// Ignore
	}
	this.sc.enumerateKeys();
}



/**
 * Generate a certificate request using a private key in the SmartCard-HSM
 *
 * This method is part of the API.
 *
 * @param {String} path the relative path of the PKI element (e.g. "/UTCVCA1/UTDVCA1")
 * @param {PublicKeyReference} currentchr the current CHR for the key in use
 * @param {PublicKeyReference} nextchr the next available CHR
 * @param {PublicKeyReference} car the CA at which this request is addressed
 * @param {boolean} forceInitial force an initial request, even if a current certificate is available
 * @param {boolean} signinitial sign with initial key (sequence = 00000)
 * @param {Key} keyspec a key object containing key parameters (e.g. EC Curve)
 * @param {ByteString} algo the terminal authentication algorithm object identifier
 * @return the certificate request
 * @type CVC
 */
EACCryptoProvider.prototype.generateRequest = function(path, currentchr, nextchr, car, forceinitial, signinitial, keyspec, algo) {

	var label = EACCryptoProvider.path2label(path, nextchr);
	GPSystem.log(GPSystem.DEBUG, module.id, "Generate private key " + label);

	if (car == null) {			// CAR is not optional in SmartCard-HSM generated requests
		car = nextchr;			// Use the CHR if no CAR defined.
	}

	var key = this.sc.getKey(label);
	if (key) {
		var newkid = key.getId();
	} else {
		var newkid = this.sc.determineFreeKeyId();
	}

	var kg = null;
	if (typeof(keyspec.getComponent(Key.ECC_P)) != "undefined") {
		var keysize = keyspec.getSize();
		if (keysize < 0) {
			var keysize = keyspec.getComponent(Key.ECC_P).length << 3;
		}
		var kg = new SmartCardHSMKeySpecGenerator(Crypto.EC, keyspec);
		var keydesc = SmartCardHSM.buildPrkDforECC(newkid, label, keysize);
	} else {
		var kg = new SmartCardHSMKeySpecGenerator(Crypto.RSA, keyspec.getSize());
		var keydesc = SmartCardHSM.buildPrkDforRSA(newkid, label, keyspec.getSize());
	}

	kg.defaultAlgo = algo;
	kg.setInnerCAR(car)
	kg.setCHR(nextchr);
	GPSystem.log(GPSystem.DEBUG, module.id, "key domain slot " + this.id);
	if (this.id >= 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "set key domain slot to " + this.id);
		kg.setKeyDomain(this.id);
	}
	var keydata = kg.encode();
	GPSystem.log(GPSystem.DEBUG, module.id, "gakp cdata");
	GPSystem.log(GPSystem.DEBUG, module.id, keydata);

	var reqbin = this.sc.generateAsymmetricKeyPair(newkid, 0, keydata);

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


// ---- Functions below are used to synchronize Certificates between the certstore and SmartCard-HSM

/**
 * Read the systems path from the SmartCard-HSM
 *
 * The path is used to configure the namespace for the node to which the SmartCard-HSM is connected
 */
EACCryptoProvider.prototype.getPathFromDevice = function() {
	var fid = ByteString.valueOf(EACCryptoProvider.PATH_EF_FID);
	if (!this.sc.hasFile(fid)) {
		return;
	}
	var s = this.sc.readBinary();
	return s.toString(ASCII);
}



/**
 * Enumerate keys on the SmartCard-HSM
 *
 * The method returns an array of objects with the following properties
 *
 * label       String - The key name on the device
 * path        String - The label transformed into a PKI path
 * chr         PublicKeyReference - the CHR for the key
 * kid         Number - The key identifier on the device
 * cvc         CVC - the card verifiable certificate or undefined if none on the device
 *
 * @type Object[]
 * @return the list of keys on the device
 */
EACCryptoProvider.prototype.enumerateKeys = function() {
	var list = this.sc.enumerateKeys();

	var keylist = [];

	for each (label in list) {
		if (label.indexOf("/") < 0) {
			continue;
		}

		var pe = label.split("/");
		var chr = new PublicKeyReference(pe[pe.length - 1]);

		var path = "";
		for (var i = 0; i < pe.length - 1; i++) {
			path += "/" + pe[i];
		}
		path += "/" + chr.getHolder();

		var key = this.sc.getKey(label);
		var kid = key.getId();

		var cvc = undefined;
		var fid = ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + kid);
		if (this.sc.hasFile(fid)) {
			var certbin = this.sc.readBinary(fid);
			cvc = new CVC(certbin);
		}
		keylist.push( { label: label, path: path, chr: chr, kid: kid, cvc: cvc } );
	}

	return keylist;
}



/**
 * Enumerate CVC certificates for CAs
 *
 * @type CVC[]
 * @return the list of CA certificates on the device
 */
EACCryptoProvider.prototype.enumerateCertificates = function() {
	var fids = this.sc.enumerateObjects();

	var certlist = [];

	for (var i = 0; i < fids.length; i += 2) {
		if (fids.byteAt(i) == EACCryptoProvider.CVCCACERTIFICATEPREFIX) {
			var fid = fids.bytes(i, 2);
			try	{
				var certbin = this.sc.readBinary(fid);
				cvc = new CVC(certbin);
				certlist.push(cvc);
			}
			catch(e) {
				GPSystem.log(GPSystem.ERROR, module.id, "Trying to read certificate : " + e);
			}
		}
	}

	return certlist;
}



/**
 * Delete CA certificates on device
 */
EACCryptoProvider.prototype.deleteCertificates = function() {
	var fids = this.sc.enumerateObjects();

	for (var i = 0; i < fids.length; i += 2) {
		if (fids.byteAt(i) == EACCryptoProvider.CVCCACERTIFICATEPREFIX) {
			var fid = fids.bytes(i, 2);
			this.sc.deleteFile(fid);
		}
	}
}



/**
 * Delete certificate on device for a given key
 *
 * @param {Object} k the key as returned by enumerateKeys()
 */
EACCryptoProvider.prototype.deleteCertificateForKey = function(k) {
	var fid = ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + k.kid);
	this.sc.deleteFile(fid);
}



/**
 * Export CA and EE certificates
 *
 * This method erases all existing CA certificates on the device first
 *
 * @param {String} path the PKI path to be exported
 * @param {CVC[]} eecertlist the list of end-entity certificates
 * @param {CVC[]} cacertlist the list of CA certificates
 */
EACCryptoProvider.prototype.exportCertificates = function(path, eecertlist, cacertlist) {
	this.deleteCertificates();

	var keylist = this.enumerateKeys();

	var cnt = 0;
	for (var i = 0; i < keylist.length; i++) {
		var k = keylist[i];
		GPSystem.log(GPSystem.DEBUG, module.id, "Find matching certificate for " + k.label );

		for (j = 0; j < eecertlist.length; j++) {
			var cvc = eecertlist[j];

			if (cvc.getCHR().equals(k.chr)) {
				GPSystem.log(GPSystem.DEBUG, module.id, "Found matching certificate " + cvc );
				var fid = ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + k.kid);

				if (k.cvc) {
					if (!k.cvc.getBytes().equals(cvc.getBytes())) {
						this.sc.deleteFile(fid);
						this.sc.updateBinary(fid, 0, cvc.getBytes());
					} else {
						GPSystem.log(GPSystem.DEBUG, module.id, "Certificate already on device - not saved");
					}
				} else {
					this.sc.updateBinary(fid, 0, cvc.getBytes());
				}

				cnt++;
			}
		}
	}

	for (var i = 0; i < cacertlist.length; i++) {
		var cvc = cacertlist[i];
		var fid = ByteString.valueOf((EACCryptoProvider.CVCCACERTIFICATEPREFIX << 8) + i);
		GPSystem.log(GPSystem.DEBUG, module.id, "Writing to " + fid + " the certificate " + cvc );
		this.sc.updateBinary(fid, 0, cvc.getBytes());
		cnt++;
	}

	GPSystem.log(GPSystem.DEBUG, module.id, "Writing path " + path );
	var fid = ByteString.valueOf(EACCryptoProvider.PATH_EF_FID);
	try 	{
		this.sc.deleteFile(fid);
	}
	catch(e) {
		// Ignore
	}

	this.sc.updateBinary(fid, 0, new ByteString(path, ASCII));

	return cnt;
}
