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
 * @fileoverview A card verifiable certificate store using a PKCS#11 device as key store
 */

// Imports

var PublicKeyReference	 = require('scsh/eac/PublicKeyReference').PublicKeyReference;
var CVC			 = require('scsh/eac/CVC').CVC;
var CVCertificateStore	 = require('scsh/eac/CVCertificateStore').CVCertificateStore;
var CVCCA		 = require('scsh/eac/CVCCA').CVCCA;



/**
 * Create a CV certificate store using a PKCS#11 device as secure key store
 *
 * @class CV certificate store with PKCS#11 as secure key store
 * @constructor
 * @param {DAOFactory} daof the factory that can create data access objects for persistent information
 * @param {PKCS11Session} p11session logged in PKCS#11 session with device
 */
function P11CVCertificateStore(daof, p11session) {
	CVCertificateStore.call(this, daof);
	this.p11session = p11session;
	this.crypto = new P11Crypto(p11session);
}

P11CVCertificateStore.prototype = Object.create(CVCertificateStore.prototype);
P11CVCertificateStore.constructor = P11CVCertificateStore;

exports.P11CVCertificateStore = P11CVCertificateStore;



/**
 * Get crypto object
 *
 * @type HSMCrypto
 * @return the HSMCrypto object
 */
P11CVCertificateStore.prototype.getCrypto = function() {
	return this.crypto;
}



/**
 * Transform path and certificate holder into a label
 *
 * @param {String} path the path
 * @param {PublicKeyReference} chr the certificate holder reference
 * @type String
 * @return the key label
 */
P11CVCertificateStore.path2label = function(path, chr) {
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
P11CVCertificateStore.prototype.getPrivateKey = function(path, car) {
	var label = P11CVCertificateStore.path2label(path, car);

	var attr = new Array();
	attr[PKCS11Object.CKA_CLASS] = PKCS11Object.CKO_PRIVATE_KEY;
	attr[PKCS11Object.CKA_LABEL] = new ByteString(label, ASCII);
	var o = this.p11session.enumerateObjects(attr);

	print(o.length);
	for (var i = 0; i < o.length; i++) {
		print(o[i].getAttribute(PKCS11Object.CKA_LABEL));
	}
	if (o.length == 0) {
		return null;
	}

	if (o.length != 1) {
		throw new GPError("P11CVCertificateStore", GPError.INVALID_ARGUMENT, o.length, "Duplicate key with label " + label + " found");
	}

	var p11key = o[0];

	var key = new Key();
	key.setType(Key.PRIVATE);

	var curve = p11key.getAttribute(PKCS11Object.CKA_EC_PARAMS);
	if (curve) {
		var a = new ASN1(curve);

		key.setComponent(Key.ECC_CURVE_OID, a.value);
	}
	key.p11 = p11key;
	return key;
}



/**
 * Determine curve from key parameter
 *
 * @param {Key} key the key
 * @type ByteString
 * @return the curve OID
 */
P11CVCertificateStore.determineCurve = function(key) {
	var curves = [
		new ByteString("brainpoolP192r1", OID),
		new ByteString("brainpoolP224r1", OID),
		new ByteString("brainpoolP256r1", OID),
		new ByteString("brainpoolP384r1", OID),
		new ByteString("brainpoolP512r1", OID)
	];

	if (key.getComponent(Key.ECC_CURVE_OID)) {
		return key.getComponent(Key.ECC_CURVE_OID);
	}

	for (var i = 0; i < curves.length; i++) {
		var spec = new Key();
		spec.setComponent(Key.ECC_CURVE_OID, curves[i]);
		if (key.getComponent(Key.ECC_P).equals(spec.getComponent(Key.ECC_P))) {
			return curves[i];
		}
	}
	throw new GPError("P11CVCertificateStore", GPError.INVALID_ARGUMENT, 0, "Unknown curve");
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
P11CVCertificateStore.prototype.generateKeyPair = function(path, chr, algo, prk, puk) {
	var label = P11CVCertificateStore.path2label(path, chr);

	label = new ByteString(label, ASCII);

	var priAttr = new Array();
	priAttr[PKCS11Object.CKA_TOKEN] = true;
	priAttr[PKCS11Object.CKA_SIGN] = true;
	priAttr[PKCS11Object.CKA_SENSITIVE] = true;
	priAttr[PKCS11Object.CKA_PRIVATE] = true;
	priAttr[PKCS11Object.CKA_LABEL] = label;

	var pubAttr = new Array();
	pubAttr[PKCS11Object.CKA_TOKEN] = true;
	pubAttr[PKCS11Object.CKA_VERIFY] = true;
	pubAttr[PKCS11Object.CKA_LABEL] = label;

	if (algo == Crypto.RSA) {
		pubAttr[PKCS11Object.CKA_MODULUS_BITS] = puk.getSize();
		pubAttr[PKCS11Object.CKA_PUBLIC_EXPONENT] = new ByteString("010001", HEX);
		var keys = this.p11session.generateKeyPair(PKCS11Session.CKM_RSA_PKCS_KEY_PAIR_GEN, null, pubAttr, priAttr);

		var value = keys[0].getAttribute(PKCS11Object.CKA_VALUE);
		var pk = new ASN1(value);
		print(pk);
		puk.setComponent(Key.MODULUS, pk.get(0).value.right(puk.getSize() >> 3));
		puk.setComponent(Key.EXPONENT, pk.get(1).value);
	} else {
		var curve = P11CVCertificateStore.determineCurve(puk);
		var curveasn = new ASN1(ASN1.OBJECT_IDENTIFIER, curve);

		pubAttr[PKCS11Object.CKA_EC_PARAMS] = curveasn.getBytes();
		var keys = this.p11session.generateKeyPair(PKCS11Session.CKM_EC_KEY_PAIR_GEN, null, pubAttr, priAttr);

		var value = keys[0].getAttribute(PKCS11Object.CKA_VALUE);
		var pk = new ASN1(value);
		var point = pk.value.bytes(1);

		prk.setComponent(Key.ECC_CURVE_OID, curve);
		puk.setComponent(Key.ECC_QX, point.left(point.length >> 1));
		puk.setComponent(Key.ECC_QY, point.right(point.length >> 1));
	}

	puk.p11 = keys[0];
	prk.p11 = keys[1];
}



function P11Crypto(p11session) {
	this.p11session = p11session;
	this.crypto = new Crypto();
}



P11Crypto.prototype.sign = function(key, mech, data, iv) {
	var ckm_sign = 0;
	var mech_hash = 0;
	var wrap = false;

	switch(mech) {
		case Crypto.ECDSA_SHA1:
			ckm_sign = PKCS11Session.CKM_ECDSA;
			mech_hash = Crypto.SHA_1;
			wrap = true;
			break;
		case Crypto.ECDSA_SHA224:
			ckm_sign = PKCS11Session.CKM_ECDSA;
			mech_hash = Crypto.SHA_224;
			wrap = true;
			break;
		case Crypto.ECDSA_SHA256:
			ckm_sign = PKCS11Session.CKM_ECDSA;
			mech_hash = Crypto.SHA_256;
			wrap = true;
			break;
		case Crypto.ECDSA_SHA384:
			ckm_sign = PKCS11Session.CKM_ECDSA;
			mech_hash = Crypto.SHA_384;
			wrap = true;
			break;
		case Crypto.ECDSA_SHA512:
			ckm_sign = PKCS11Session.CKM_ECDSA;
			mech_hash = Crypto.SHA_512;
			wrap = true;
			break;
		case Crypto.ECDSA:
			ckm_sign = PKCS11Session.CKM_ECDSA;
			wrap = true;
			break;
		case Crypto.RSA_SHA1:
			ckm_sign = PKCS11Session.CKM_SHA1_RSA_PKCS;
			break;
		case Crypto.RSA_SHA256:
			ckm_sign = PKCS11Session.CKM_SHA256_RSA_PKCS;
			break;
		case Crypto.RSA_SHA512:
			ckm_sign = PKCS11Session.CKM_SHA512_RSA_PKCS;
			break;
		case Crypto.RSA_PSS_SHA1:
			ckm_sign = PKCS11Session.CKM_SHA1_RSA_PKCS_PSS;
			break;
		case Crypto.RSA_PSS_SHA256:
			ckm_sign = PKCS11Session.CKM_SHA256_RSA_PKCS_PSS;
			break;
		case Crypto.RSA_PSS_SHA512:
			ckm_sign = PKCS11Session.CKM_SHA512_RSA_PKCS_PSS;
			break;
		default:
			throw new GPError("P11Crypto", GPError.INVALID_ARGUMENT, 2, "Unsupported mechanism");
	}

	if (mech_hash) {
		data = this.crypto.digest(mech_hash, data);
	}

	// Test with single step C_Sign
	this.p11session.signInit(ckm_sign, key.p11);

	var signature = this.p11session.sign(data);

	if (wrap) {
		signature = CVC.wrapSignature(signature);
	}

	return signature;
}



P11Crypto.prototype.verify = function(key, mech, data, sig) {
	return this.crypto.verify(key, mech, data, sig);
}



P11CVCertificateStore.testPath = GPSystem.mapFilename("testca", GPSystem.CWD);

P11CVCertificateStore.test = function() {
	var p = new PKCS11Provider("/usr/local/lib/opensc-pkcs11.so");

	try	{
		var slots = p.getSlots();
		print(slots);
		var slot = slots[1];

		print("Using slot: " + slot.getId());

		// Open R/W session
		var s = new PKCS11Session(p, slot.getId(), true);

		// Login with USER PIN
		s.login("648219");

		var cs = new P11CVCertificateStore(P11CVCertificateStore.testPath + "/cvca", s);

		var crypto = cs.getCrypto();

		var prk = new Key();
		prk.setType(Key.PRIVATE);
		prk.setComponent(Key.ECC_CURVE_OID, new ByteString("brainpoolP256r1", OID));
		var puk = new Key();
		puk.setType(Key.PUBLIC);
		puk.setComponent(Key.ECC_CURVE_OID, new ByteString("brainpoolP256r1", OID));

		var chr = new PublicKeyReference("DE00001");
		cs.generateKeyPair("/test", chr, Crypto.ECC, prk, puk);
		var msg = new ByteString("Hello World", ASCII);

		var sig = crypto.sign(prk, Crypto.ECDSA_SHA1, msg);
		assert(crypto.verify(puk, Crypto.ECDSA_SHA1, msg, sig));

		var sig = crypto.sign(prk, Crypto.ECDSA_SHA224, msg);
		assert(crypto.verify(puk, Crypto.ECDSA_SHA224, msg, sig));

		var sig = crypto.sign(prk, Crypto.ECDSA_SHA256, msg);
		assert(crypto.verify(puk, Crypto.ECDSA_SHA256, msg, sig));

		var sig = crypto.sign(prk, Crypto.ECDSA_SHA384, msg);
		assert(crypto.verify(puk, Crypto.ECDSA_SHA384, msg, sig));

		var sig = crypto.sign(prk, Crypto.ECDSA_SHA512, msg);
		assert(crypto.verify(puk, Crypto.ECDSA_SHA512, msg, sig));


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
	finally {
		p.cleanup();
	}
}
