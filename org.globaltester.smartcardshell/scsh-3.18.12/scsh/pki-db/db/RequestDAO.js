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

var Holder = require('scsh/pki-db/Holder').Holder;
var Request = require('scsh/pki-db/Request').Request;



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



RequestDAO.create = [
"CREATE TABLE IF NOT EXISTS Request (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	holderId MEDIUMINT UNSIGNED NOT NULL REFERENCES Holder(id)," +
"	keyId VARBINARY(64) NOT NULL," +
"	bytes VARBINARY(4096) NOT NULL," +
"	PRIMARY KEY (id)," +
"	FOREIGN KEY (holderId) REFERENCES Holder(id) ON DELETE CASCADE" +
")",
{	H2: "CREATE INDEX IF NOT EXISTS Request_Idx1 ON Request(keyId);",
	MySQL: {
		IsEmpty: "SHOW INDEX FROM Request WHERE Key_name = 'Request_Idx1';",
		Statement: "ALTER TABLE Request ADD INDEX Request_Idx1 (keyId);"
	}}
];

RequestDAO.drop = "DROP TABLE IF EXISTS Request";



RequestDAO.prototype.toString = function() {
	return "RequestDAO(db)";
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

	var request = new Request(this, holder, keyId, encodedRequest, template);

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "Request", request);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		request.id = rs.getInt(1);
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return request;
}



/**
 * Get request identified by id
 *
 * @param {Number} id the request id
 * @param {Holder} holder the holder of this request
 * @type Request
 * @return the request object or null if not found
 */
RequestDAO.prototype.getRequest = function(id, holder) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getRequest(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be number");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Request where id = ?;");
		stmt.setInt(1, id);
		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "id " + id + " not found");
			return null;
		}
		var request = new Request(this, holder);
		this.factory.resultSetToProperties(rs, request);
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return request;
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

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Request where keyId = ? and holderId = ?;");
		stmt.setBytes(1, keyId);
		stmt.setInt(2, holder.id);
		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "keyId " + keyId + " not found");
			return null;
		}
		var request = new Request(this, holder, keyId);
		this.factory.resultSetToProperties(rs, request);
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return request;
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

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from Request where id = ?;");

		stmt.setInt(1, request.id);
		stmt.executeUpdate();
	}
	finally {
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}
	return true;
}
