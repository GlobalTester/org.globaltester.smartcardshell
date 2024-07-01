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
 * @fileoverview RequestDAO
 */

Holder = require('scsh/pki-db/Holder').Holder;
Request = require('scsh/pki-db/Request').Request;



/**
 * Data access object for requests
 *
 * @param {Object} the factory that created this DAO
 */
function RequestDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.RequestDAO = RequestDAO;



RequestDAO.prototype.toString = function() {
	return "RequestDAO(db)";
}



RequestDAO.prototype.getFilename = function(holder, keyId) {
	if ((holder.certificateType & 0xF) == Holder.CVC) {
		return keyId.toString(ASCII) + ".cvreq";
	} else {
		return keyId.toString(HEX) + ".pkcs10";
	}
}



/**
 * Create and persists a new request object
 *
 * @param {Holder} holder the holder of this request
 * @param {ByteString} keyId the keyId of the request
 * @param {ByteString} encodedRequest the request
 * @param {Object} template with additional database fields
 * @type Request
 * @return the newly created request object
 */
RequestDAO.prototype.newRequest = function(holder, keyId, encodedRequest, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newRequest(" + holder + "," + keyId + "," + encodedRequest + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(keyId, "Parameter keyId must not be empty");
	assert(keyId instanceof ByteString, "Parameter must be instance of ByteString");
	assert(encodedRequest, "Parameter encodedRequest must not be empty");
	assert(encodedRequest instanceof ByteString, "Parameter must be instance of ByteString");
	assert((typeof(template) == "undefined") || (template instanceof Object), "Parameter template be an object");

	var r = new Request(this, holder, keyId, encodedRequest, template);

	var fn = holder._path + "/" + this.getFilename(holder, keyId);
	GPSystem.log(GPSystem.INFO, module.id, "Saving request to " + fn);
	this.factory.saveBinaryFile(fn, encodedRequest);

	return r;
}



/**
 * Get request identified by keyId
 *
 * @param {Holder} holder the holder of this request
 * @param {ByteString} keyId the keyId of the request
 * @type Request
 * @return the request object or null if not found
 */
RequestDAO.prototype.getRequestByKeyId = function(holder, keyId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getRequest(" + holder + "," + keyId + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(keyId, "Parameter keyId must not be empty");
	assert(keyId instanceof ByteString, "Parameter must be instance of ByteString");

	var r = new Request(this, holder, keyId);

	var fn = holder._path + "/" + this.getFilename(holder, keyId);
	var bin = this.factory.loadBinaryFile(fn);

	var r = new Request(this, holder, keyId, bin);

	return r;
}



/**
 * Delete request
 *
 * @param {Request} request the request to delete
 * @type boolean
 * @return true if deleted
 */
RequestDAO.prototype.deleteRequest = function(request) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteRequest(" + request + ")");

	assert(request, "Parameter request must not be empty");
	assert(request instanceof Request, "Parameter must be instance of Request");

	var fn = request._holder._path + "/" + this.getFilename(request._holder, request.keyId);
	return this.factory.deleteFile(fn);
}
