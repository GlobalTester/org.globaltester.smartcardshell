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

var Holder = require('scsh/pki-db/Holder').Holder;
var Signer = require('scsh/pki-db/Signer').Signer;



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



SignerDAO.create = [
"CREATE TABLE IF NOT EXISTS Signer (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	holderId MEDIUMINT UNSIGNED NOT NULL REFERENCES Holder(id)," +
"	name VARCHAR(100) NOT NULL," +
"	keyId VARBINARY(64)," +
"	keyDomain VARBINARY(32)," +
"	keyblob VARBINARY(4096)," +
"	content LONGTEXT," +
"	PRIMARY KEY (id)," +
"	UNIQUE (holderId, name)," +
"	FOREIGN KEY (holderId) REFERENCES Holder(id) ON DELETE CASCADE" +
")",
{	H2: "CREATE INDEX IF NOT EXISTS Signer_Idx1 ON Signer(keyId);",
	MySQL: {
		IsEmpty: "SHOW INDEX FROM Signer WHERE Key_name = 'Signer_Idx1';",
		Statement: "ALTER TABLE Signer ADD INDEX Signer_Idx1 (keyId);"
	}}
];

SignerDAO.drop = "DROP TABLE IF EXISTS Signer";



SignerDAO.prototype.toString = function() {
	return "ServiceRequestDAO(db)";
}



SignerDAO.prototype.toString = function() {
	return "SignerDAO(db)";
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

	var signer = new Signer(this, holder, name, keyId, template);

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "Signer", signer);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		signer.id = rs.getInt(1);
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

	return signer;
}



/**
 * Get signer identified by id
 *
 * @param {Number} id the id
 * @type Signer
 * @return the signer object or null if not found
 */
SignerDAO.prototype.getSignerByID = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSigner(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Signer where id = ?;");
		stmt.setInt(1, id);
		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No matching signer found for ID " + id);
			return null;
		}
		var signer = new Signer(this);
		this.factory.resultSetToProperties(rs, signer);
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

	return signer;
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

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Signer where name = ? and holderId = ?;");
		stmt.setString(1, name);
		stmt.setInt(2, holder.id);
		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "name " + name + " not found");
			return null;
		}
		var signer = new Signer(this, holder);
		this.factory.resultSetToProperties(rs, signer);
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

	return signer;
}



/**
 * TODO The tuple (holderId,keyId) is not unique.
 * 		The result set may consists of more than one row.
 *
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
	assert(keyId, "Parameter keyId must not be empty");
	assert(keyId instanceof ByteString, "Parameter must be instance of ByteString");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Signer where keyId = ? and holderId = ?;");
		stmt.setBytes(1, keyId);
		stmt.setInt(2, holder.id);
		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "KeyId " + keyId + " not found");
			return null;
		}
		var signer = new Signer(this, holder);
		this.factory.resultSetToProperties(rs, signer);
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

	return signer;
}



/**
 * List all signer for the given holder id
 *
 * @param {ByteString} keyId the key identifier
 * @type Signer[]
 * @return list of signer
 */
SignerDAO.prototype.listSignerByHolderId = function(holderId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listSignerByHolderId( " + holderId + " )");

	assert(holderId, "Parameter holderId must not be empty");
	assert(typeof(holderId) == "number", "Parameter holderId must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Signer where holderId = ?;");
		stmt.setInt(1, holderId);
		rs = stmt.executeQuery();

		while (rs.next()) {
			var signer = new Signer(this);
			this.factory.resultSetToProperties(rs, signer);
			list.push(signer);
		}

		if (list.length == 0) {
			GPSystem.log(GPSystem.DEBUG, module.id, "holderId " + holderId + " not found");
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

	return list;
}



/**
 * List all signer for the given key id
 *
 * @param {ByteString} keyId the key identifier
 * @type Signer[]
 * @return list of signer
 */
SignerDAO.prototype.listSignerByKeyId = function(keyId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listSignerByKeyId( " + keyId + " )");

	assert(keyId, "Parameter name must not be empty");
	assert(keyId instanceof ByteString, "Parameter must be instance of ByteString");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Signer where keyId = ?;");
		stmt.setBytes(1, keyId);
		rs = stmt.executeQuery();

		while (rs.next()) {
			var signer = new Signer(this);
			this.factory.resultSetToProperties(rs, signer);
			list.push(signer);
		}

		if (list.length == 0) {
			GPSystem.log(GPSystem.DEBUG, module.id, "KeyId " + keyId + " not found");
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

	return list;
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

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Signer set keyblob = ? where id = ?;");

		stmt.setBytes(1, keyblob);
		stmt.setInt(2, signer.id);
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

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from Signer where id = ?;");

		stmt.setInt(1, signer.id);
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
 * Update the signer content
 *
 * @param {Signer} signer the signer to update
 * @param {String} content the new content
 */
SignerDAO.prototype.updateContent = function(signer) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateContent(" + signer + ")");

	assert(signer, "Parameter subject must not be empty");
	assert(signer instanceof Signer, "Parameter must be instance of Signer");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Signer set content = ? where id = ?;");

		stmt.setString(1, signer.serialize());
		stmt.setInt(2, signer.id);
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
