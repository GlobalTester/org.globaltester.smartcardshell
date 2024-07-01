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
 * @fileoverview TokenDAO for database objects
 */

var Token			= require('scsh/pki-db/Token').Token;
var TokenAction		= require('scsh/pki-db/TokenAction').TokenAction;
var Subject			= require('scsh/pki-db/Subject').Subject;
var ServiceRequest 		= require('scsh/pki-db/ServiceRequest').ServiceRequest;


/**
 * Data access object for token
 *
 * @param {Object} the factory that created this DAO
 */
function TokenDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.TokenDAO = TokenDAO;


TokenDAO.create = [
"CREATE TABLE IF NOT EXISTS Token (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	path VARCHAR(100) NOT NULL," +
"	subjectId MEDIUMINT UNSIGNED REFERENCES Subject(id)," +
"	lastSeen TIMESTAMP DEFAULT NOW()," +
"	keyDomain VARBINARY(20)," +
"	serviceRequestId MEDIUMINT UNSIGNED REFERENCES ServiceRequest(id)," +
"	PRIMARY KEY (id)," +
"	unique (path)," +
"	FOREIGN KEY (serviceRequestId) REFERENCES ServiceRequest(id) ON DELETE SET NULL," +
"	FOREIGN KEY (subjectId) REFERENCES Subject(id) ON DELETE SET NULL" +
")",
"CREATE TABLE IF NOT EXISTS TokenAction (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	tokenId MEDIUMINT UNSIGNED REFERENCES Token(id)," +
"	serviceRequestId MEDIUMINT UNSIGNED REFERENCES ServiceRequest(id)," +
"	PRIMARY KEY (id)," +
"	FOREIGN KEY (tokenId) REFERENCES Token(id) ON DELETE CASCADE," +
"	FOREIGN KEY (serviceRequestId) REFERENCES ServiceRequest(id) ON DELETE CASCADE" +
")"
];


TokenDAO.drop = [
"DROP TABLE IF EXISTS TokenAction",
"DROP TABLE IF EXISTS Token"
];



TokenDAO.prototype.toString = function() {
	return "TokenDAO(db)";
}



/**
 * Create and persists a new token
 *
 * @param {String} tokenPath the path of this token
 * @param {Object} template the optional template
 * @type Token
 * @return the newly created token object
 */
TokenDAO.prototype.newToken = function(tokenPath, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newToken(" + tokenPath + ")");

	assert(tokenPath, "Parameter tokenPath must not be empty");
	assert(typeof(tokenPath) == "string", "Parameter tokenPath must be a String");

	var token = new Token(this, tokenPath, template);

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "Token", token);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		token.id = rs.getInt(1);
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

	return token;
}



/**
 * Delete token
 *
 * @param {String} path the token path
 * @type boolean
 * @return true if deleted
 */
TokenDAO.prototype.deleteToken = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteToken(" + path + ")");

	assert(path, "Parameter path must not be empty");
	assert(typeof(path) == "string", "Parameter path must be a String");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from Token where path = ?;");

		stmt.setString(1, path);
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



/**
 * Get token for given id
 *
 * @param {Number} id the id of the token
 * @type Token
 * @return the token for the given id or null
 */
TokenDAO.prototype.getTokenById = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getTokenById(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;
	var token = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Token where id = ?;");
		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "id " + id + " not found");
			return null;
		}

		token = new Token(this);
		this.factory.resultSetToProperties(rs, token);
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

	return token;
}



/**
 * Get token for given path
 *
 * @param {String} path the path of the token
 * @type Token
 * @return the token for the given path or null
 */
TokenDAO.prototype.getToken = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getToken(" + path + ")");

	assert(path, "Parameter path must not be empty");
	assert(typeof(path) == "string", "Parameter path must be a String");

	var con = null;
	var stmt = null;
	var rs = null;
	var token = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Token where path = ?;");
		stmt.setString(1, path);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "path " + path + " not found");
			return null;
		}

		token = new Token(this);
		this.factory.resultSetToProperties(rs, token);
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

	return token;
}



/**
 * Get all token which are registered for a given subject
 *
 * @param {Number} subjectId the subject id of the requested token
 * @type Token[]
 * @return the list of token for the given subject id
 */
TokenDAO.prototype.getTokenListBySubjectId = function(subjectId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getTokenListBySubjectId(" + subjectId + ")");

	assert(subjectId, "Parameter subjectId must not be empty");
	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var token = null;
	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Token where subjectId = ?;");
		stmt.setInt(1, subjectId);

		rs = stmt.executeQuery();

		while (rs.next()) {
			token = new Token(this);
			this.factory.resultSetToProperties(rs, token);
			list.push(token);
		}
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

	if (list.length == 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "No token found for subject id " + subjectId);
	}

	return list;
}



/**
 * Get all token of the same key domain
 *
 * @param {ByteString} keyDomain the key domain
 * @type Token[]
 * @return the list of token for the given key domain
 */
TokenDAO.prototype.getTokenListByKeyDomain = function(keyDomain) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getTokenListByKeyDomain(" + keyDomain + ")");

	assert(keyDomain instanceof ByteString, "Parameter must be instance of ByteString");

	var con = null;
	var stmt = null;
	var rs = null;
	var token = null;
	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Token where keyDomain = ?;");
		stmt.setBytes(1, keyDomain);

		rs = stmt.executeQuery();

		while (rs.next()) {
			token = new Token(this);
			this.factory.resultSetToProperties(rs, token);
			list.push(token);
		}
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

	if (list.length == 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "No token found for key domain " + keyDomain);
	}

	return list;
}


/**
 * Update key domain and last seen timestamp
 *
 * @param {ByteString} keyDomain the key domain
 */
TokenDAO.prototype.updateKeyDomainAndLastSeen = function(path, keyDomain) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateKeyDomainAndLastSeen(" + path + ", " + keyDomain + ")");

	assert(path, "Parameter path must not be empty");
	assert(typeof(path) == "string", "Parameter path must be a String");
	assert(keyDomain instanceof ByteString, "Parameter must be instance of ByteString");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Token set keyDomain = ?, lastSeen = ? where path = ?;");

		stmt.setBytes(1, keyDomain);
		var ts = new java.sql.Timestamp(new Date());
		stmt.setTimestamp(2, ts);
		stmt.setString(3, path);
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
}



/**
 * Update the token's subject
 *
 * @param {Token} token the token
 * @param {Number} subjectId the new subject
 */
TokenDAO.prototype.updateSubjectId = function(token, subjectId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateSubjectId(" + token + "," + subjectId + ")");

	assert(token, "Parameter token must not be empty");
	assert(token instanceof Token, "Parameter must be instance of Token");
	assert(subjectId, "Parameter subjectId must not be empty");
	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Token set subjectId = ? where path = ?;");

		stmt.setInt(1, subjectId);
		stmt.setString(2, token.path);
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

	token.subjectId = subjectId;
}



/**
 * Update the token's service request
 *
 * @param {Token} token the token
 * @param {Number} serviceRequestId the service request id
 */
TokenDAO.prototype.updateServiceRequestId = function(token, serviceRequestId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateServiceRequestId(" + token + "," + serviceRequestId+ ")");

	assert(token, "Parameter token must not be empty");
	assert(token instanceof Token, "Parameter must be instance of Token");
	assert(serviceRequestId, "Parameter serviceRequestId must not be empty");
	assert(typeof(serviceRequestId) == "number", "Parameter serviceRequestId must be a number");
	serviceRequestId

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Token set serviceRequestId = ? where path = ?;");

		stmt.setInt(1, serviceRequestId);
		stmt.setString(2, token.path);
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

	token.serviceRequestId = serviceRequestId;
}



/**
 * Set the token's subject id to null
 *
 * @param {Token} token the token
 */
TokenDAO.prototype.deregisterToken = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deregisterToken(" + path + ")");

	assert(path, "Parameter path must not be empty");
	assert(typeof(path) == "string", "Parameter path must be a String");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Token set subjectId = NULL, serviceRequestId = NULL where path = ?;");

		stmt.setString(1, path);
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
}



/**
 * Add token action
 *
 * @param {Number} tokenId the token database id
 * @param {Number} serviceRequestId the database id of the service request handling this action
 */
TokenDAO.prototype.addTokenAction = function(tokenId, serviceRequestId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "addTokenAction(" + tokenId + "," + serviceRequestId + ")");

	assert(typeof(tokenId) == "number", "Parameter tokenId must be a number");
	assert(typeof(serviceRequestId) == "number", "Parameter serviceRequestId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;

	var tokenAction = new TokenAction(this, tokenId, serviceRequestId);

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "TokenAction", tokenAction);

		stmt.executeUpdate();

		rs = stmt.getGeneratedKeys();
		rs.next();
		tokenAction.id = rs.getInt(1);
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

	return tokenAction;
}



/**
 * Enumerate pending service requests for token
 *
 * @param {Token} token the token
 */
TokenDAO.prototype.enumerateTokenAction = function(tokenId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "enumerateTokenAction(" + tokenId + ")");

	assert(typeof(tokenId) == "number", "Parameter tokenId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var result = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from TokenAction where tokenId = ? order by id;");
		stmt.setInt(1, tokenId);
		rs = stmt.executeQuery();
		while (rs.next()) {
			var action = new TokenAction(this);
			this.factory.resultSetToProperties(rs, action);
			result.push(action);
		}
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

	return result;
}



/**
 * Remove token action
 *
 * @param {Number} id the token action id
 */
TokenDAO.prototype.removeTokenAction = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "removeTokenAction(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be a number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from TokenAction where id = ?;");

		stmt.setInt(1, id);
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
}



/**
 * Remove token action
 *
 * @param {Number} id the service request id
 */
TokenDAO.prototype.removeTokenActionForServiceRequest = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "removeTokenActionForServiceRequest(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be a number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from TokenAction where serviceRequestId = ?;");

		stmt.setInt(1, id);
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
}
