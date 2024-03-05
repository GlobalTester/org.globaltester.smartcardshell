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
 * @fileoverview HolderDAO for database objects
 */

var Holder = require('scsh/pki-db/Holder').Holder;
var Certificate = require('scsh/pki-db/Certificate').Certificate;



/**
 * Data access object for certificate holders
 *
 * @param {Object} the factory that created this DAO
 */
function HolderDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.HolderDAO = HolderDAO;


HolderDAO.create =
"CREATE TABLE IF NOT EXISTS Holder (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	certificateType SMALLINT UNSIGNED NOT NULL," +
"	parentId MEDIUMINT UNSIGNED," +
"	name VARCHAR(100)," +
"	subjectId MEDIUMINT UNSIGNED REFERENCES Subject(id)," +
"	signerNo MEDIUMINT UNSIGNED," +
"	certId MEDIUMINT UNSIGNED," +
"	UNIQUE (certificateType, parentId, name)," +
"	PRIMARY KEY (id)," +
"	FOREIGN KEY (parentId) REFERENCES Holder(id) ON DELETE CASCADE," +
"	FOREIGN KEY (subjectId) REFERENCES Subject(id) ON DELETE SET NULL" +
")";


HolderDAO.drop = "DROP TABLE IF EXISTS Holder";



HolderDAO.prototype.toString = function() {
	return "HolderDAO(db)";
}



/**
 * Strip the last element of the path, effectively defining the parent within the path
 *
 * @private
 * @param {String} path the path to strip the last element from
 * @returns the parent path or null for the root
 * @type String
 */
HolderDAO.parentPathOf = function(path) {
	var ofs = path.lastIndexOf("/");
	if (ofs <= 0) {
		return null;
	}
	return path.substr(0, ofs);
}



/**
 * Determine object id for holder identified by path
 *
 * @param {String} path the PKI path
 * @type Number
 * @return the id or 0 if not found
 */
HolderDAO.prototype.determineId = function(path, certtype) {
	GPSystem.log(GPSystem.DEBUG, module.id, "determineId(" + path + "," + certtype + ")");

	var path = path.substr(1).split("/");
	assert(path.length > 0, "Path must contain at least one element");
	assert(typeof(certtype) == "number", "Certtype must be number");

	var con = null;
	var stmt = null;
	var rs = null;
	var id = 0;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select id from Holder where certificateType = ? and parentId is null and name = ?;");
		stmt.setInt(1, certtype);
		stmt.setString(2, path[0]);
		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "name " + path[0] + " at root level not found for certtype = " + certtype);
			return 0;
		}

		var id = rs.getInt(1);
		rs.close();
		stmt.close();

		stmt = con.prepareStatement("select id from Holder where parentId = ? and name = ?;");
		for (var i = 1; i < path.length; i++) {
			stmt.setInt(1, id);
			stmt.setString(2, path[i]);
			rs = stmt.executeQuery();
			if (!rs.next()) {
				GPSystem.log(GPSystem.DEBUG, module.id, "name " + path[i] + " at level " + i + "not found");
				return 0;
			}
			id = rs.getInt(1);
			rs.close();
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
	return id;
}



/**
 * Create and persists a new holder object without a path specifier
 *
 * @param {Number} certtype one of Holder.CVC or Holder.X509. See Holder for explanation
 * @type Holder
 * @return the newly created holder object
 */
HolderDAO.prototype.newHolderForParent = function(parentId, certtype, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newHolderForParent(" + parentId + "," + certtype + ")");

	assert(typeof(parentId) == "number", "Parameter parentId must be number");

	if (!certtype) {
		certtype = Holder.CVC;
	}

	assert(((certtype & 0xF) == Holder.CVC) || ((certtype & 0xF) == Holder.X509), "Parameter certtype invalid");
	assert((typeof(template) == "undefined") || (template instanceof Object), "Parameter template be an object");

	var holder = new Holder(this, undefined, certtype, template);

	var con = null;
	var stmt = null;
	var rs = null;

	if (parentId) {
		holder.parentId = parentId;
	}

	try	{
		con = this.factory.getConnection();

		var stmt = this.factory.insertStatementFromObject(con, "Holder", holder);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		holder.id = rs.getInt(1);
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

	return holder;
}



/**
 * Create and persists a new holder object
 *
 * @param {String} path the path in the PKI hierachie
 * @param {Number} certtype one of Holder.CVC or Holder.X509. See Holder for explanation
 * @type Holder
 * @return the newly created holder object
 */
HolderDAO.prototype.newHolder = function(path, certtype) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newHolder(" + path + "," + certtype + ")");

	assert(path, "Parameter path must not be empty");
	assert(typeof(path) == "string", "Parameter path must be a String");

	if (!certtype) {
		certtype = Holder.CVC;
	}

	assert(((certtype & 0xF) == Holder.CVC) || ((certtype & 0xF) == Holder.X509), "Parameter certtype invalid");

	var holder = new Holder(this, path, certtype);

	var con = null;
	var stmt = null;
	var rs = null;

	var parentid = 0;

	var ofs = path.lastIndexOf("/");

	if (ofs > 0) {
		parentid = this.determineId(path.substr(0, ofs), certtype);
		if (!parentid) {
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "Path " + path + " is invalid");
		}
		holder.parentId = parentid;
	}

	try	{
		con = this.factory.getConnection();

		var stmt = this.factory.insertStatementFromObject(con, "Holder", holder);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		holder.id = rs.getInt(1);
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

	return holder;
}



/**
 * Get holder for given PKI path
 *
 * @param {String} path the path in the PKI hierachie
 * @type Holder
 * @return the holder at the path
 */
HolderDAO.prototype.getHolder = function(path, certtype) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getHolder(" + path + "," + certtype + ")");

	assert(path, "Parameter path must not be empty");
	assert(typeof(path) == "string", "Parameter path must be a String");
	assert(typeof(certtype) == "number", "Certtype must be number");

	var con = null;
	var stmt = null;
	var rs = null;
	var holder = null;
	var ofs = path.lastIndexOf("/");

	var parentid = 0;
	if (ofs > 0) {
		parentid = this.determineId(path.substr(0, ofs), certtype);
		if (!parentid) {
			GPSystem.log(GPSystem.DEBUG, module.id, "Path " + path + " is invalid");
			return null;
		}

	}

	var name = path.substr(ofs + 1);

	try	{
		con = this.factory.getConnection();

		if (parentid) {
			stmt = con.prepareStatement("select * from Holder where name = ? and parentId = ?;");
			stmt.setInt(2, parentid);
		} else {
			stmt = con.prepareStatement("select * from Holder where name = ? and parentId is null and certificateType = ?;");
			stmt.setInt(2, certtype);
		}
		stmt.setString(1, name);
		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "name " + name + " not found with parent " + parentid);
			return null;
		}
		holder = new Holder(this, path);
		this.factory.resultSetToProperties(rs, holder);
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

	return holder;
}



/**
 * Get holder for given id
 *
 * @param {Number} id the holder id
 * @type Holder
 * @return the holder for the given id
 */
HolderDAO.prototype.getHolderById = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getHolderById(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be number");

	var con = null;
	var stmt = null;
	var rs = null;
	var holder = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Holder where id = ?;");
		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "id " + id + " not found");
			return null;
		}
		holder = new Holder(this, undefined);
		this.factory.resultSetToProperties(rs, holder);
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

	return holder;
}



/**
 * Get holder for a given subject, parent holder and certificate type
 *
 * @param {Number} subjectId the subject id
 * @param {Number} parentId the parent holder id
 * @param {Number} certificateType one of Holder.CVC or Holder.X509. See Holder for explanation
 * @type Holder
 * @return the holder or null if not found
 */
HolderDAO.prototype.getHolderBySubjectAndParent = function(subjectId, parentId, certificateType) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getHolderBySubjectAndParent(subjectId=" + subjectId + ", parentId=" + parentId + ", certificateType=" + certificateType + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");
	assert(typeof(parentId) == "number", "Parameter parentId must be a number");
	assert(typeof(certificateType) == "number", "Parameter certificateType must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var holder = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Holder where subjectId = ? and parentId = ? and certificateType = ?;");
		stmt.setInt(1, subjectId);
		stmt.setInt(2, parentId);
		stmt.setInt(3, certificateType);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No holder found");
			return null;
		}
		holder = new Holder(this, undefined);
		this.factory.resultSetToProperties(rs, holder);
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

	return holder;
}



/**
 * Get holder for a given subject, parent holder and certificate type
 *
 * @param {Number} subjectId the subject id
 * @param {Number} parentId the parent holder id
 * @param {Number} certificateType one of Holder.CVC or Holder.X509. See Holder for explanation
 * @type Holder
 * @return the holder or null if not found
 */
HolderDAO.prototype.getHolderByTypeAndName = function(parentId, name, certificateType) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getHolderByTypeAndName(parentId=" + parentId + ", name=" + name + ", certificateType=" + certificateType + ")");

	assert(typeof(parentId) == "number", "Parameter parentId must be a number");
	assert(typeof(name) == "string", "Parameter name must be a number");
	assert(typeof(certificateType) == "number", "Parameter certificateType must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var holder = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Holder where parentId = ? and name = ? and certificateType = ?;");
		stmt.setInt(1, parentId);
		stmt.setString(2, name);
		stmt.setInt(3, certificateType);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No holder found");
			return null;
		}
		holder = new Holder(this, undefined);
		this.factory.resultSetToProperties(rs, holder);
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

	return holder;
}



/**
 * Get a list of holders under the PKI path.
 *
 * @param {String} path the path in the PKI hierachie, use "/" to obtain root holders.
 * @type String[]
 * @return the list of holder names at the path
 */
HolderDAO.prototype.getHolderList = function(path, certtype) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getHolderList(" + path + "," + certtype + ")");

	assert(typeof(path) == "string", "Parameter path must be a String");
	assert(typeof(certtype) == "number", "Certtype must be number");

	var con = null;
	var stmt = null;
	var rs = null;

	var parentid = 0;
	if (path.length > 1) {
		parentid = this.determineId(path, certtype);
		if (!parentid) {
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "Path " + path + " is invalid");
		}

	}

	var list = [];

	try	{
		con = this.factory.getConnection();

		if (parentid) {
			stmt = con.prepareStatement("select name from Holder where parentId = ?;");
			stmt.setInt(1, parentid);
		} else {
			stmt = con.prepareStatement("select name from Holder where certificateType = ? and parentId is null;");
			stmt.setInt(1, certtype);
		}
		rs = stmt.executeQuery();
		while (rs.next()) {
			list.push(rs.getString(1));
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
 * Count the number of holders where the given holder is parent
 *
 * @param {Number} holderId the holder id
 * @type Number
 * @return number of child holders
 */
HolderDAO.prototype.countSubHolder = function(holderId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "countSubHolder(" + holderId + ")");

    assert(typeof(holderId) == "number", "Parameter holderId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var count = 0;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select count(1) from Holder where parentId = ?;");
		stmt.setInt(1, holderId);

		rs = stmt.executeQuery();
        if (rs.next()) {
            count = rs.getInt(1);
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

	return count;
}



/**
 * Get a list of holder for a given subject
 *
 * @param {Number} subjectId the subject id
 * @type Holder[]
 * @return the holder list
 */
HolderDAO.prototype.getHolderListBySubject = function(subjectId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getHolderListBySubject(subjectId=" + subjectId + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Holder where subjectId = ?;");
		stmt.setInt(1, subjectId);

		rs = stmt.executeQuery();
		while (rs.next()) {
			var holder = new Holder(this, undefined);
			this.factory.resultSetToProperties(rs, holder);
			list.push(holder);
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
 * Determine the path for the given holder
 *
 * @param {Holder} holder the holder
 * @type Holder[]
 * @return the path as a list of holders
 */
HolderDAO.prototype.determineHolderPathList = function(holder) {
	GPSystem.log(GPSystem.DEBUG, module.id, "determineHolderPathList(holder=" + holder + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");

	var list = null;

	if (holder.parentId) {
		var parent = this.getHolderById(holder.parentId);
		list = this.determineHolderPathList(parent);
		list.push(holder);
	} else {
		list = []
		list.push(holder); // root holder
	}

	return list;
}



/**
 * Update the holder name
 *
 * @param {Holder} holderId the holder id
 * @param {Number} name the new holder name
 */
HolderDAO.prototype.updateName = function(holderId, name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateName(" + holderId + "," + name + ")");

	assert(typeof(holderId) == "number", "Parameter holderId must be a Number");
	assert(typeof(name) == "string", "Parameter name must be a String");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Holder set name = ? where id = ?;");

		stmt.setString(1, name);
		stmt.setInt(2, holderId);
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
 * Update the subject id
 *
 * @param {Holder} holder the holder
 * @param {Number} val the subject id
 */
HolderDAO.prototype.updateSubjectId = function(holder, val) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateSubjectId(" + holder + "," + val + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(typeof(val) == "number", "Parameter val must be a Number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Holder set subjectId = ? where id = ?;");

		stmt.setInt(1, val);
		stmt.setInt(2, holder.id);
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

	holder.subjectId = val;
}


/**
 * Update the signer number
 *
 * @param {Holder} holder the holder
 * @param {Number} val the new signer number
 */
HolderDAO.prototype.updateSignerNo = function(holder, val) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateSignerNo(" + holder + "," + val + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(typeof(val) == "number", "Parameter val must be a Number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Holder set signerNo = ? where id = ?;");

		stmt.setInt(1, val);
		stmt.setInt(2, holder.id);
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

	holder.signerNo = val;
}



/**
 * Update the current certificate
 *
 * @param {Holder} holder the holder
 * @param {Number} val the new signer number
 */
HolderDAO.prototype.updateCurrentCertificate = function(holder, certificate) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateCurrentCertificate(" + holder + "," + certificate + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(certificate, "Parameter certificate must not be empty");
	assert(certificate instanceof Certificate, "Parameter must be instance of Certificate");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Holder set certId = ? where id = ?;");

		stmt.setInt(1, certificate.id);
		stmt.setInt(2, holder.id);
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

	holder.certId = certificate.id;
}



/**
 * Delete holder
 *
 * @param {Holder} holder the holder to delete
 * @type boolean
 * @return true if deleted
 */
HolderDAO.prototype.deleteHolder = function(holder) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteHolder(" + holder + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from Holder where id = ?;");

		stmt.setInt(1, holder.id);
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
