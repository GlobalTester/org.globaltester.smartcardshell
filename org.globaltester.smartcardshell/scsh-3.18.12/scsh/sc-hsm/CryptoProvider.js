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
 * @fileoverview SmartCard-HSM Crypto Provider
 */

var SmartCardHSM				= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSM;
var SmartCardHSMKeySpecGenerator		= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSMKeySpecGenerator;
var SmartCardHSMSymmetricKeySpecGenerator	= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSMSymmetricKeySpecGenerator;
var HSMKeyStore					= require('scsh/sc-hsm/HSMKeyStore').HSMKeyStore;



/**
 * Crypto Provider for accessing a SmartCard-HSM
 *
 * @param {SmartCardHSM} sc the associated SmartCard-HSM
 * @param {Number} slot the key domain slot. If undefined or -1 no key domain will be set
 */
function CryptoProvider(sc, id, slot) {
	this.id = id;
	this.slot = slot; // the key domain slot
	this.setSmartCardHSM(sc);
	this.deleteIfExists = false;
}

exports.CryptoProvider = CryptoProvider;



/**
 * Replace SmartCard-HSM
 *
 * @param {SmartCardHSM} sc the new SmartCard-HSM
 */
CryptoProvider.prototype.setSmartCardHSM = function(sc) {
	this.sc = sc;
	this.ks = new HSMKeyStore(sc);
}



/**
 * Release this crypto provider
 *
 * The release() method shall be called if the provider is not used anymore
 * Place the release in the finally statement of a try/catch block
 */
CryptoProvider.prototype.release = function() {
}



/**
 * Get crypto object
 *
 * This method is part of the API.
 *
 * @type HSMCrypto
 * @return the HSMCrypto object
 */
CryptoProvider.prototype.getCrypto = function() {
	if (this.sc) {
		return this.sc.getCrypto();
	}
	return new Crypto();
}



/**
 * Get a handle for a private key stored on the SmartCard-HSM
 *
 * @param {String} label the label of the private key
 * @param {ByteString} blob the optional key blob
 * @returns the private key
 * @type Key
 */
CryptoProvider.prototype.getPrivateKeyByLabel = function(label, blob) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getPrivateKeyByLabel(" + label + ")");
	var key = this.ks.getKey(label);
	GPSystem.log(GPSystem.DEBUG, module.id, "key " + key);
	return key;
}



/**
 * Get a handle for a private key stored on the SmartCard-HSM
 *
 * @param {String} label the label of the private key
 * @param {ByteString} blob the optional key blob
 * @returns the private key
 * @type Key
 */
CryptoProvider.prototype.getPrivateKeyByKeyId = function(keyid, blob) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getPrivateKeyByKeyId(" + keyid + ")");
	var key = this.ks.getKey(keyid);
	GPSystem.log(GPSystem.DEBUG, module.id, "key " + key);
	return key;
}



/**
 * Generate a key pair under the given label with the key characteristics defined in keyspec
 *
 * @param {String} label the label for this key
 * @param {Key} the key specification
 * @return an object containing the private key as property prk and the public key as property puk
 * @type Object
 */
CryptoProvider.prototype.generateKeyPair = function(label, keyspec) {
	GPSystem.log(GPSystem.DEBUG, module.id, "generateKeyPair(" + label + ")");

	if (this.ks.hasKey(label)) {
		if (this.deleteIfExists) {
			this.ks.deleteKey(label);
		} else {
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "A key with label " + label + " does already exist");
		}
	}

	if (typeof(keyspec.getComponent(Key.ECC_P)) != "undefined") {
		var kg = new SmartCardHSMKeySpecGenerator(Crypto.EC, keyspec);
	} else {
		var kg = new SmartCardHSMKeySpecGenerator(Crypto.RSA, keyspec.getSize());
	}

	if (this.slot >= 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "set key domain to " + this.slot);
		kg.setKeyDomain(this.slot);
	}

	var req = this.ks.generateKeyPair(label, kg);
	var puk = req.getPublicKey();
	var prk = this.ks.getKey(label);
	return { prk: prk, puk: puk, req: req.getBytes() };
}



/**
 * Delete private key
 *
 * @param {String} label the key label
 */
CryptoProvider.prototype.deletePrivateKey = function(label) {
	this.ks.deleteKey(label);
}



/**
 * Generate a symmetric key under the given label
 *
 * @param {String} label the label for this key
 * @param {Number} keySize either 128, 192 or 256
 * @param {ByteString} allowedAlgorithms the optional list of allowed algorithms (0x10 for encryption, 0x11 for decryption, 0x18 for CMAC). By default all algorithms are allowed.
 * @param {String} wrappingKeyLabel the label of the optional wrapping key
 * @return the new key wrapped with the wrapping key
 * @type ByteString
 */
CryptoProvider.prototype.generateKey = function(label, keySize, allowedAlgorithms, wrappingKeyLabel) {
	GPSystem.log(GPSystem.DEBUG, module.id, "generateKey(" + label + ", " + keySize + ")");

	if (this.ks.hasKey(label)) {
		if (this.deleteIfExists) {
			this.ks.deleteKey(label);
		} else {
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "A key with label " + label + " does already exist");
		}
	}

	if (!allowedAlgorithms) {
		var allowedAlgorithms = new ByteString("101118", HEX);
	}

	var kg = new SmartCardHSMKeySpecGenerator(Crypto.AES, keySize);
	kg.setAlgorithms(allowedAlgorithms);

	if (wrappingKeyLabel) {
		if (!this.ks.hasKey(wrappingKeyLabel)) {
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "A key with label " + wrappingKeyLabel + " does already exist");
		}
		var wrappingKey = this.ks.getKey(wrappingKeyLabel);
		kg.wrappingKey = wrappingKey.getId();
	}

	if (this.slot >= 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "set key domain to " + this.slot);
		kg.setKeyDomain(this.slot);
	}

	var wrapbin = this.ks.generateKey(label, kg);
	return wrapbin;
}
