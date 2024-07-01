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
 * @fileoverview SignerDAO
 */

Holder = require('scsh/pki-db/Holder').Holder;
Signer = require('scsh/pki-db/Signer').Signer;



/**
 * Data access object for signers
 *
 * @param {Object} the factory that created this DAO
 */
function SignerDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.SignerDAO = SignerDAO;



SignerDAO.prototype.toString = function() {
	return "SignerDAO(fs)";
}



/**
 * Create and persists a new signer object
 *
 * @param {Holder} holder the holder of this signer
 * @param {String} name the name of the signer
 * @param {ByteString} keyId the key identifier
 * @type Signer
 * @return the newly created signer object
 */
SignerDAO.prototype.newSigner = function(holder, name, keyId, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newSigner(" + holder + "," + name + "," + keyId + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(name, "Parameter name must not be empty");
	assert(typeof(name) == "string", "Parameter name must be a String");
	assert(keyId, "Parameter name must not be empty");
	assert(keyId instanceof ByteString, "Parameter must be instance of ByteString");
	assert((typeof(template) == "undefined") || (template instanceof Object), "Parameter template be an object");

	var s = new Signer(this, holder, name, keyId, template);

	if (s.keyblob) {
		this.updateSignerKey(s, s.keyblob);
	}
	return s;
}



SignerDAO.prototype.getFilename = function(holder, keyId) {
	if ((holder.certificateType & 0xF) == Holder.CVC) {
		return keyId.toString(ASCII) + ".pkcs8";
	} else {
		return keyId.toString(HEX) + ".pkcs8";
	}
}



/**
 * Get signer identified by name
 *
 * @param {Holder} holder the holder of this signer
 * @param {String} name the name of the signer
 * @type Signer
 * @return the signer object or null if not found
 */
SignerDAO.prototype.getSignerByName = function(holder, name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSigner(" + holder + "," + name + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(name, "Parameter name must not be empty");
	assert(typeof(name) == "string", "Parameter name must be a String");

	var signer = new Signer(this, holder, name, new ByteString(name, ASCII));

	var fn = holder._path + "/" + name + ".pkcs8";

	try	{
		var bin = this.factory.loadBinaryFile(fn);
	}
	catch(e) {
		GPSystem.log(GPSystem.DEBUG, module.id, "File " + fn + " not found");
		return null;
	}

	signer.keyblob = bin;
	return signer;
}



/**
 * Get signer identified by key id
 *
 * @param {Holder} holder the holder of this signer
 * @param {ByteString} keyId the key identifier
 * @type Signer
 * @return the signer object or null if not found
 */
SignerDAO.prototype.getSignerByKeyId = function(holder, keyId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSigner(" + holder + "," + keyId + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(keyId, "Parameter name must not be empty");
	assert(keyId instanceof ByteString, "Parameter must be instance of ByteString");

	var signer = new Signer(this, holder, keyId.toString(ASCII), keyId);

	var fn = holder._path + "/" + this.getFilename(holder, keyId);

	try	{
		var bin = this.factory.loadBinaryFile(fn);
	}
	catch(e) {
		GPSystem.log(GPSystem.DEBUG, module.id, "File " + fn + " not found");
		return null;
	}

	signer.keyblob = bin;
	return signer;
}



/**
 * Update signer key
 *
 * @param {Signer} signer the signer for which the key shall be updated
 * @param {ByteString} keyblob the private key
 */
SignerDAO.prototype.updateSignerKey = function(signer, keyblob) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateSignerKey(" + signer + ")");

	assert(signer, "Parameter signer must not be empty");
	assert(signer instanceof Signer, "Parameter must be instance of Signer");

	assert(keyblob, "Parameter keyblob must not be empty");
	assert(keyblob instanceof ByteString, "Parameter must be instance of ByteString");

	var fn = signer._holder._path + "/" + this.getFilename(signer._holder, signer.keyId);
	GPSystem.log(GPSystem.INFO, module.id, "Saving private key to " + fn);
	this.factory.saveBinaryFile(fn, keyblob);
	this.keyblob = keyblob;
}



/**
 * Delete signer
 *
 * @param {Signer} signer the signer to delete
 * @type boolean
 * @return true if deleted
 */
SignerDAO.prototype.deleteSigner = function(signer) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteSigner(" + signer + ")");

	assert(signer, "Parameter signer must not be empty");
	assert(signer instanceof Signer, "Parameter must be instance of Signer");

	var fn = signer._holder._path + "/" + this.getFilename(signer._holder, signer.keyId);
	return this.factory.deleteFile(fn);
}
