/**
 *  ---------
 * |.##> <##.|  SmartCard-HSM Support Scripts
 * |#       #|
 * |#       #|  Copyright (c) 2011-2012 CardContact Software & System Consulting
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
 * @fileoverview Class implementing a key store for X.509 certificate and private keys stored on a SmartCard-HSM
 */

PublicKeyReference = require('scsh/eac/PublicKeyReference').PublicKeyReference;
SmartCardHSM = require('scsh/sc-hsm/SmartCardHSM').SmartCardHSM;
SmartCardHSMKey = require('scsh/sc-hsm/SmartCardHSM').SmartCardHSMKey;
CVC = require("scsh/eac/CVC").CVC;



/**
 * Create a simple key store front-end
 *
 * @class Class implementing some simple access functions to generate key pairs and store certificates
 * @param {SmartCardHSM} sc the SmartCard-HSM card service
 */
function HSMKeyStore(sc) {
	this.sc = sc;
	this.chr = new PublicKeyReference("UTNULL00000");
	this.car = new PublicKeyReference("UTNULL00000");
}

exports.HSMKeyStore = HSMKeyStore;



/**
 * Generate a key pair
 *
 * @param {String} label the label under which the key pair shall be stored
 * @param {SmartCardHSMKeySpecGenerator} initialized key spec generator
 * @type CVC
 * @return the authenticated request
 */
HSMKeyStore.prototype.generateKeyPair = function(label, spec) {

	if ((spec.keytype != Crypto.RSA) && (spec.keytype != Crypto.EC)) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Unsupported key type");
	}

	var key = this.sc.getKey(label);
	if (key) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Key with label " + label + " does already exist");
	}

	var newkid = this.sc.determineFreeKeyId();
	var reqbin = this.sc.generateAsymmetricKeyPair(newkid, 0, spec.encode());
	var req = new CVC(reqbin);
	var keyid = req.determineKeyIdentifier();

	switch(spec.keytype) {
		case Crypto.RSA:
			var keydesc = SmartCardHSM.buildPrkDforRSA(keyid, label, spec.keysize);
			break;
		case Crypto.EC:
			var keydesc = SmartCardHSM.buildPrkDforECC(keyid, label, spec.domainParameter.getSize());
			break;
		default:
			throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Unsupported key type");
	}

	var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + newkid);
	this.sc.updateBinary(fid, 0, keydesc.getBytes());

	var hkey = new SmartCardHSMKey(this.sc, newkid);
	hkey.setDescription(keydesc);
	this.sc.addKeyToMap(hkey);
	return req;
}



/**
 * Generate a symmetric key
 *
 * @param {String} label the label under which the key shall be stored
 * @param {SmartCardHSMKeySpecGenerator} initialized key spec generator
 * @type ByteString
 * @return the new key wrapped with the symmetric key defined with SmartCardHSMKeySpecGenerator.setWrappingKey()
 */
HSMKeyStore.prototype.generateKey = function(label, spec) {

	if (spec.keytype != Crypto.AES) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Unsupported key type");
	}

	var key = this.sc.getKey(label);
	if (key) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Key with label " + label + " does already exist");
	}

	var newkid = this.sc.determineFreeKeyId();

	var genalg;
	switch(spec.keysize) {
		case 128: genalg = 0xB0; break;
		case 192: genalg = 0xB1; break;
		case 256: genalg = 0xB2; break;
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Unsupported key size");
	}

	var wrapbin = this.sc.generateSymmetricKey(newkid, genalg, spec.encode());

	var deralg;
	if (spec.algorithms.find(ByteString.valueOf(SmartCardHSM.ALG_CMAC)) >= 0) {
		deralg = SmartCardHSM.ALG_CMAC;
	} else if (spec.algorithms.find(ByteString.valueOf(SmartCardHSM.ALG_DERIVE_SP800_56C)) >= 0) {
		deralg = SmartCardHSM.ALG_DERIVE_SP800_56C;
	}

	var keyid;
	if (deralg) {
		keyid = this.sc.deriveSymmetricKey(newkid, deralg, new ByteString("KeyCheckValue", ASCII)).left(8);
	} else {
		keyid = ByteString.valueOf(newkid);
	}

	var keydesc = SmartCardHSM.buildSKDforAES(keyid, label, spec.keysize);

	var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + newkid);
	this.sc.updateBinary(fid, 0, keydesc.getBytes());

	var hkey = new SmartCardHSMKey(this.sc, newkid);
	hkey.setDescription(keydesc);
	this.sc.addKeyToMap(hkey);
	return wrapbin;
}



/**
 * Generate a RSA key pair
 *
 * @param {String} label the label under which the key pair shall be stored
 * @param {Number} keysize the key size in bits (1024, 1536 or 2048)
 */
HSMKeyStore.prototype.generateRSAKeyPair = function(label, keysize) {

	var key = this.sc.getKey(label);
	if (key) {
		var newkid = key.getId();
	} else {
		var newkid = this.sc.determineFreeKeyId();
	}

	var algo = new ByteString("id-TA-RSA-v1-5-SHA-256", OID);

	var keydata = SmartCardHSM.buildGAKPwithRSA(this.car, algo, this.chr, keysize);
	var keydesc = SmartCardHSM.buildPrkDforRSA(newkid, label, keysize);

	var reqbin = this.sc.generateAsymmetricKeyPair(newkid, 0, keydata);

	var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + newkid);
	this.sc.updateBinary(fid, 0, keydesc.getBytes());
	var req = new CVC(reqbin);

	var hkey = new SmartCardHSMKey(this.sc, newkid);
	hkey.setDescription(keydesc);
	this.sc.addKeyToMap(hkey);
	return req;
}



/**
 * Generate an ECDSA key pair
 *
 * @param {String} label the label under which the key pair shall be stored
 * @param {String} curve the curve object identifier
 */
HSMKeyStore.prototype.generateECCKeyPair = function(label, curve) {

	var key = this.sc.getKey(label);
	if (key) {
		var newkid = key.getId();
	} else {
		var newkid = this.sc.determineFreeKeyId();
	}

	var algo = new ByteString("id-TA-ECDSA-SHA-256", OID);

	var dp = new Key();
	dp.setComponent(Key.ECC_CURVE_OID, new ByteString(curve, OID));

	var keydata = SmartCardHSM.buildGAKPwithECC(this.car, algo, this.chr, dp);
//	print("Keysize: " + dp.getSize());
	var keydesc = SmartCardHSM.buildPrkDforECC(newkid, label, dp.getSize());

	var reqbin = this.sc.generateAsymmetricKeyPair(newkid, 0, keydata);

	var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + newkid);
	this.sc.updateBinary(fid, 0, keydesc.getBytes());
	var req = new CVC(reqbin);

	var hkey = new SmartCardHSMKey(this.sc, newkid);
	hkey.setDescription(keydesc);
	this.sc.addKeyToMap(hkey);

	return req;
}



/**
 * Import a key blob, meta data and certificate
 *
 * @param {ByteString} keywrap the binary key in SmartCard-HSM format
 */
HSMKeyStore.prototype.importKey = function(keywrap) {

	var a = new ASN1(keywrap);

	var wrap = a.get(0).value;
	var id = this.sc.determineFreeKeyId();

	if (id < 0) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Key identifier exhausted");
	}

	this.sc.unwrapKey(id, wrap);

	var hkey = new SmartCardHSMKey(this.sc, id);

	if (a.elements > 1) {
		var meta = a.get(1);
		this.sc.updateBinary(ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + id), 0, meta.getBytes());
		hkey.setDescription(meta);
	}

	var bin = new ByteString("", HEX);
	for (var i = 2; i < a.elements; i++) {
		var cert = a.get(i);
		bin = bin.concat(cert.getBytes());
	}
	this.sc.updateBinary(ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + id), 0, bin);

	this.sc.addKeyToMap(hkey);

	return hkey;
}



/**
 * Export a key blob, meta data and certificate
 *
 * @param {String/Number/Key} labelOrIdOrKey the label, id or object of the key to be removed
 * @type ByteString
 * @return the blob with key, meta data and certificate
 */
HSMKeyStore.prototype.exportKey = function(labelOrIdOrKey) {

	var key = labelOrIdOrKey;
	if (!(key instanceof SmartCardHSMKey)) {
		key = this.getKey(labelOrIdOrKey);
	}

	if (key) {
		var id = key.getId();
	} else {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Could not find a key with label or id " + labelOrIdOrKey);
	}

	var wrap = this.sc.wrapKey(id);
	var a = new ASN1(0x30, new ASN1(0x04, wrap));

	try	{
		var meta = this.sc.readBinary(ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + id));
		a.add(new ASN1(meta));

		var fid = ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + id);
		if (this.sc.hasFile(fid)) {
			var cert = this.sc.readBinary(fid);

			if (cert.byteAt(0) == 0x67) {
				var list = SmartCardHSM.parseCertificateList(cert);
				for (var i = 0; i < list.length; i++) {
					a.add(list[i].getASN1());
				}
			} else {
				a.add(new ASN1(cert));
			}
		}
	}
	catch(e) {
		print("Ignoring meta data or certificate: " + e);
	}

	return a.getBytes();
}



/**
 * Import a RSA key blob
 *
 * @param {String} label the key label
 * @param {ByteString} keyblob the binary key in SmartCard-HSM format
 * @param {Number} keysize in bits
 * @param {Number/ByteString} keyid the optional PKCS#15 key identifier.
 * Default value is the next free key id of the SmartCard-HSM.
 * @type SmartCardHSMKey
 */
HSMKeyStore.prototype.importRSAKey = function(label, keyblob, keysize, keyid) {
	var keytype = keyblob.byteAt(8);
	if ((keytype != 5) && (keytype != 6)) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "keyblob does not contain a RSA key");
	}

	var key = this.sc.getKey(label);
	if (key) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "A key with label " + label + " does already exist");
	}
	var newkid = this.sc.determineFreeKeyId();

	this.sc.unwrapKey(newkid, keyblob);

	if (typeof(keyid) == "undefined") {
		keyid = newkid;
	}

	var keydesc = SmartCardHSM.buildPrkDforRSA(keyid, label, keysize);

	var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + newkid);
	this.sc.updateBinary(fid, 0, keydesc.getBytes());

	var hkey = new SmartCardHSMKey(this.sc, newkid);
	hkey.setDescription(keydesc);
	this.sc.addKeyToMap(hkey);

	return hkey;
}



/**
 * Import an ECC key blob
 *
 * @param {String} label the key label
 * @param {ByteString} keyblob the binary key in SmartCard-HSM format
 * @param {Number} keysize in bits
 * @param {Number/ByteString} keyid the optional PKCS#15 key identifier.
 * Default value is the next free key id of the SmartCard-HSM.
 * @type SmartCardHSMKey
 */
HSMKeyStore.prototype.importECCKey = function(label, keyblob, keysize, keyid) {
	var keytype = keyblob.byteAt(8);
	if (keytype != 12) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "keyblob does not contain an ECC key");
	}
	var key = this.sc.getKey(label);
	if (key) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "A key with label " + label + " does already exist");
	}
	var newkid = this.sc.determineFreeKeyId();

	this.sc.unwrapKey(newkid, keyblob);

	if (typeof(keyid) == "undefined") {
		keyid = newkid;
	}

	var keydesc = SmartCardHSM.buildPrkDforECC(keyid, label, keysize);

	var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + newkid);
	this.sc.updateBinary(fid, 0, keydesc.getBytes());

	var hkey = new SmartCardHSMKey(this.sc, newkid);
	hkey.setDescription(keydesc);
	this.sc.addKeyToMap(hkey);

	return hkey;
}



/**
 * Import an AES key blob
 *
 * @param {String} label the key label
 * @param {ByteString} keyblob the binary key in SmartCard-HSM format
 * @param {Number} keysize in bits
 * @param {ByteString} keyid the PKCS#15 key id (CKA_ID)
 * @type
 */
HSMKeyStore.prototype.importAESKey = function(label, keyblob, keysize, keyid) {

	var key = this.sc.getKey(label);
	if (key) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "A key with label " + label + " does already exist");
	}
	var newkid = this.sc.determineFreeKeyId();

	this.sc.unwrapKey(newkid, keyblob);

	if (typeof(keyid) == "undefined") {
		keyid = newkid;
	}

	var keydesc = SmartCardHSM.buildSKDforAES(keyid, label, keysize);

	var fid = ByteString.valueOf((SmartCardHSM.PRKDPREFIX << 8) + newkid);
	this.sc.updateBinary(fid, 0, keydesc.getBytes());

	var hkey = new SmartCardHSMKey(this.sc, newkid);
	hkey.setDescription(keydesc);
	this.sc.addKeyToMap(hkey);

	return hkey;
}



/**
 * Store certificate under given label
 *
 * @param {String/Number/Key} labelOrIdOrKey the label, id or object of the key for which the certificate should be stored
 * @param {X509} cert the certificate
 */
HSMKeyStore.prototype.storeEndEntityCertificate = function(labelOrIdOrKey, cert) {
	var key = labelOrIdOrKey;
	if (!(key instanceof SmartCardHSMKey)) {
		key = this.getKey(labelOrIdOrKey);
	}

	if (key) {
		var kid = key.getId();
	} else {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Could not find a key with label " + label);
	}

	var fid = ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + kid);
	if (!(cert instanceof ByteString)) {
		cert = cert.getBytes();
	}
	this.sc.updateBinary(fid, 0, cert);
}



/**
 * Store CA certificate under given label
 *
 * @param {String} label the label under which the certificate shall be stored
 * @param {X509} cert the certificate
 */
HSMKeyStore.prototype.storeCACertificate = function(label, cert) {
	this.sc.enumerateCACertificates();
	var id = this.sc.caidmap[label];
	if (id == undefined) {
		id = this.sc.determineFreeCAId();
	}

	var fid = ByteString.valueOf((SmartCardHSM.CACERTIFICATEPREFIX << 8) + id);
	this.sc.updateBinary(fid, 0, cert.getBytes());

	var descr = SmartCardHSM.buildCertDescription(label, null, cert.getPublicKey(), fid);
	var fid = ByteString.valueOf((SmartCardHSM.CERTDPREFIX << 8) + id);
	this.sc.updateBinary(fid, 0, descr.getBytes());
	this.sc.addCACertificateToMap(cert, id, label);
}



/**
 * Delete CA certificate with given label
 *
 * @param {String} label the label of certificate to be removed
 */
HSMKeyStore.prototype.deleteCACertificate = function(label) {
	var cert = this.sc.getCACertificate(label);

	if (!cert) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Could not find a certificate with label " + label);
	}

	var fid = ByteString.valueOf((SmartCardHSM.CERTDPREFIX << 8) + cert.id);
	this.sc.deleteFile(fid);
	var fid = ByteString.valueOf((SmartCardHSM.CACERTIFICATEPREFIX << 8) + cert.id);
	this.sc.deleteFile(fid);
	this.sc.enumerateCACertificates();
}



/**
 * Delete key and certificate with given label
 *
 * @param {String/Number/Key} labelOrIdOrKey the label, id or object of the key to be removed
 */
HSMKeyStore.prototype.deleteKey = function(labelOrIdOrKey) {
	var key = labelOrIdOrKey;
	if (!(key instanceof SmartCardHSMKey)) {
		key = this.getKey(labelOrIdOrKey);
	}

	if (key) {
		var kid = key.getId();
	} else {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Could not find a key with label " + labelOrIdOrKey);
	}

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

	this.enumerateKeys();
}



/**
 * Return list of keys
 *
 * @type String[]
 * @return the list of key names
 */
HSMKeyStore.prototype.enumerateKeys = function() {
	return this.sc.enumerateKeys();
}



/**
 * Check if key with label exists
 *
 * @param {String / Number} the key label or id
 * @type Boolean
 * @return true if key exists
 */
HSMKeyStore.prototype.hasKey = function(labelOrId) {
	var key = this.sc.getKey(labelOrId);
	return key != null;
}



/**
 * Get key for given label
 *
 * @param {String / Number} the key label or id
 * @type Key
 * @return the key
 */
HSMKeyStore.prototype.getKey = function(labelOrId) {
	var key = this.sc.getKey(labelOrId);
	if (!key) {
		throw new GPError("HSMKeyStore", GPError.INVALID_DATA, 0, "Could not find a key with label/id " + labelOrId);
	}
	return key;
}



/**
 * Check if key has a certificate
 *
 * @param {String/Number/Key} labelOrIdOrKey the certificate label, id or key
 * @type Boolean
 * @return true of a certificate is present
 */
HSMKeyStore.prototype.hasCertificate = function(labelOrIdOrKey) {
	var key = labelOrIdOrKey;
	if (!(key instanceof SmartCardHSMKey)) {
		key = this.getKey(labelOrIdOrKey);
	}
	var kid = key.getId();
	var fid = ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + kid);
	return this.sc.hasFile(fid);
}



/**
 * Get raw certificate for given label
 *
 * @param {String/Number/Key} labelOrIdOrKey the certificate label, id or key
 * @type ByteString
 * @return the certificate
 */
HSMKeyStore.prototype.getCertificate = function(labelOrIdOrKey) {
	var key = labelOrIdOrKey;
	if (!(key instanceof SmartCardHSMKey)) {
		key = this.getKey(labelOrIdOrKey);
	}
	var kid = key.getId();
	var fid = ByteString.valueOf((SmartCardHSM.EECERTIFICATEPREFIX << 8) + kid);
	var certbin = this.sc.readBinary(fid);
	return certbin;
}



/**
 * Get certificate for given label
 *
 * @param {String/Number/Key} labelOrIdOrKey the certificate label, id or key
 * @type X509
 * @return the certificate
 */
HSMKeyStore.prototype.getEndEntityCertificate = function(labelOrIdOrKey) {
	var certbin = this.getCertificate(labelOrIdOrKey);
	return new X509(certbin);
}
