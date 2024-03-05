/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2016 CardContact Software & System Consulting
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
 * @fileoverview SubjectDAO for database objects
 */

var Subject = require('scsh/pki-db/Subject').Subject;
var Role = require('scsh/pki-db/Role').Role;



/**
 * Data access object for certificate subjects
 *
 * @param {Object} the factory that created this DAO
 */
function SubjectDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.SubjectDAO = SubjectDAO;



SubjectDAO.TYPE_PERSON = "Person";
SubjectDAO.TYPE_SYSTEM = "System";
SubjectDAO.TYPE_TRUST_CENTER = "TrustCenter";
SubjectDAO.TYPE_EST_Server = "ESTServer";
SubjectDAO.TYPE_GROUP_MANAGER = "GroupManager";
SubjectDAO.TYPE_CA = "CA";
SubjectDAO.TYPE_ROOT_CA = "X509RootCA";
SubjectDAO.TYPE_SCHEME_ROOT_CA = "SchemeRootCA";
SubjectDAO.TYPE_DEVICE_ISSUER = "DeviceIssuer";

SubjectDAO.LIFECYCLE_PRIVATE = 0;
SubjectDAO.LIFECYCLE_PUBLIC = 1;
SubjectDAO.LIFECYCLE_SUSPENDED = 2;
SubjectDAO.LIFECYCLE_TERMINATED = 3;



SubjectDAO.create =
"CREATE TABLE IF NOT EXISTS Subject (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	email VARCHAR(100)," +
"	name VARCHAR(100)," +
"	type VARCHAR(20)," +
"	assuranceLevel MEDIUMINT UNSIGNED NOT NULL DEFAULT 0," +
"	managedByRoleId MEDIUMINT UNSIGNED REFERENCES Role(id)," +
"	lifecycle MEDIUMINT UNSIGNED NOT NULL DEFAULT 0," +
"	serviceRequestId MEDIUMINT UNSIGNED," +
"	content LONGTEXT," +
"	PRIMARY KEY (id)," +
"	UNIQUE (email)," +
"	UNIQUE (type, name)" +
")";



SubjectDAO.addForeignKey = [
	{
		H2:
			"ALTER TABLE Subject " +
			"ADD CONSTRAINT IF NOT EXISTS Subject_FK FOREIGN KEY (serviceRequestId) " +
			"REFERENCES ServiceRequest(id);",
		MySQL:
			"ALTER TABLE Subject " +
			"ADD CONSTRAINT Subject_FK FOREIGN KEY IF NOT EXISTS (serviceRequestId) " +
			"REFERENCES ServiceRequest(id);"
	}
];



SubjectDAO.drop = "DROP TABLE IF EXISTS Subject";



SubjectDAO.dropForeignKey = [
	{
		H2:
			"ALTER TABLE Subject DROP CONSTRAINT IF EXISTS Subject_FK",
		MySQL:
			"ALTER TABLE Subject DROP FOREIGN KEY IF EXISTS Subject_FK"
	}
]


SubjectDAO.prototype.toString = function() {
	return "SubjectDAO(db)";
}



/**
 * Create and persists a new subject
 *
 * @type Subject
 * @return the newly created subject object
 */
SubjectDAO.prototype.newSubject = function(template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newSubject()");

	var subject = new Subject(this, template);

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "Subject", subject);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		subject.id = rs.getInt(1);
	}
	finally {
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return subject;
}



/**
 * Get the subject object
 *
 * @param {Number} id the subject id
 * @type Subject
 * @return the subject for the given id or null
 */
SubjectDAO.prototype.getSubject = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSubject(" + id + ")");

	assert(id, "Parameter id must not be empty");
	assert(typeof(id) == "number", "Parameter id must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;
	var subject = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Subject where id = ?;");
		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "id " + id + " not found");
			return null;
		}

		subject = new Subject(this);
		this.factory.resultSetToProperties(rs, subject);
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

	return subject;
}



/**
 * Get the subject object
 *
 * @param {String} email the subject's e-mail address
 * @type Subject
 * @return the subject or null
 */
SubjectDAO.prototype.getSubjectByEmail = function(email) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSubject(" + email + ")");

	assert(email, "Parameter email must not be empty");
	assert(typeof(email) == "string", "Parameter email must be a string");

	var con = null;
	var stmt = null;
	var rs = null;
	var subject = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Subject where email = ?;");
		stmt.setString(1, email);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "e-mail address " + email + " not found");
			return null;
		}

		subject = new Subject(this);
		this.factory.resultSetToProperties(rs, subject);
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

	return subject;
}



/**
 * Get the subject object
 *
 * @param {String} name the subject's name
 * @type Subject
 * @return the subject or null
 */
SubjectDAO.prototype.getSubjectByName = function(name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSubjectByName(" + name + ")");

	assert(name, "Parameter name must not be empty");
	assert(typeof(name) == "string", "Parameter name must be a string");

	var con = null;
	var stmt = null;
	var rs = null;
	var subject = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Subject where name = ?;");
		stmt.setString(1, name);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No subject found for name " + name);
			return null;
		}

		subject = new Subject(this);
		this.factory.resultSetToProperties(rs, subject);

		if (rs.next()) {
			GPSystem.log(GPSystem.WARN, module.id, "Multiple subjects found for name " + name);
			return null;
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

	return subject;
}



/**
 * Get subject object by type and name
 *
 * @param {String} type the subject's type
 * @param {String} name the subject's name
 * @type Subject
 * @return the subject or null
 */
SubjectDAO.prototype.getSubjectByTypeAndName = function(type, name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getSubjectByTypeAndName(" + type + "," + name + ")");

	assert(type, "Parameter type must not be empty");
	assert(typeof(type) == "string", "Parameter type must be a string");
	assert(name, "Parameter name must not be empty");
	assert(typeof(name) == "string", "Parameter name must be a string");

	var con = null;
	var stmt = null;
	var rs = null;
	var subject = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Subject where type = ? and name = ?;");
		stmt.setString(1, type);
		stmt.setString(2, name);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No subject found for type " + type + " and name " + name);
			return null;
		}

		subject = new Subject(this);
		this.factory.resultSetToProperties(rs, subject);
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

	return subject;
}



/**
 * Get a list of subjects that are managed by the given manager role
 *
 * @param {Role} role the manager role
 * @type Subject[]
 * @return the list of managed subjects
 */
SubjectDAO.prototype.getManagedSubjects = function(roleId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getManagedSubject(" + roleId + ")");

	assert(roleId, "Parameter id must not be empty");
	assert(typeof(roleId) == "number", "Parameter id must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;
	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Subject where managedByRoleId = ?;");
		stmt.setInt(1, roleId);

		rs = stmt.executeQuery();
		while (rs.next()) {
			var subject = new Subject(this);
			this.factory.resultSetToProperties(rs, subject);
			list.push(subject);
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
 * List all subjects that match the given filter
 *
 * @param {Object} filter the filter criteria object
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type Subject[]
 * @return list of subjects
 */
SubjectDAO.prototype.listManagedSubjectsByFilter = function(filter, offset, page) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listManagedSubjectsByFilter(" + filter + "," + offset + "," + page + ")");

	assert(typeof(filter) == "object", "Parameter filter must be an object");
	assert(typeof(offset) == "undefined" || typeof(offset) == "number", "Parameter offset must be a Number");
	assert(typeof(page) == "undefined" || typeof(page) == "number", "Parameter page must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

 		var query = "SELECT id, email, name, type, assuranceLevel, managedByRoleId, content "
 		+ "FROM Subject left join AssignedRole on (roleId = managedByRoleId)";

		var filstr = this.factory.whereClauseFromFilter(filter);
		if (filstr.length > 0) {
			query += " WHERE " + filstr;
		}

		if (page) {
			query += " LIMIT ?,?";
		}

		GPSystem.log(GPSystem.DEBUG, module.id, "query= " + query);

		stmt = con.prepareStatement(query);

		var c = this.factory.setArgumentsFromFilter(stmt, 1, filter, offset, page);

		rs = stmt.executeQuery();
		while (rs.next()) {
			var subject = new Subject(this);
			this.factory.resultSetToProperties(rs, subject);
			list.push(subject);
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
 * Count the subjects that match the given criteria
 *
 * @param {Object} filter the filter criteria object
 * @type Number
 * @return the number of subjects that match the given filter
 */
SubjectDAO.prototype.countManagedSubjectsByFilter = function(filter) {
	GPSystem.log(GPSystem.DEBUG, module.id, "countManagedSubjectsByFilter(" + filter + ")");

	assert(typeof(filter) == "object", "Parameter filter must be an object");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var query = "SELECT count(1) "
		+ "FROM Subject left join AssignedRole on (roleId = managedByRoleId)"

		var filstr = this.factory.whereClauseFromFilter(filter);
		if (filstr.length > 0) {
			query += " WHERE " + filstr;
		}
		GPSystem.log(GPSystem.DEBUG, module.id, "query= " + query);

		stmt = con.prepareStatement(query);

		this.factory.setArgumentsFromFilter(stmt, 1, filter);

		rs = stmt.executeQuery();
		rs.next();
		var count = rs.getInt(1);

		GPSystem.log(GPSystem.DEBUG, module.id, "countManagedSubjectsByFilter() returns " + count);
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
 * List all managed subjects that match the given filter
 *
 * @param {Object} filter the filter criteria object
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type Subject[]
 * @return list of subjects
 */
SubjectDAO.prototype.listManagedSubjects = function(subjectId, managedByRoleId, typeFilter, nameFilter, emailFilter, pageStart, pageEnd) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listManagedSubjects(" + subjectId + "," + managedByRoleId + "," + typeFilter + "," + nameFilter + "," + emailFilter + "," + pageStart + "," + pageEnd + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a Number");

	assert(typeof(managedByRoleId) == "undefined" || typeof(managedByRoleId) == "number", "Parameter managedByRoleId must be a Number");
	assert(typeof(typeFilter) == "undefined" || typeof(typeFilter) == "string", "Parameter typeFilter must be a string");
	assert(typeof(nameFilter) == "undefined" || typeof(nameFilter) == "string", "Parameter nameFilter must be a string");
	assert(typeof(emailFilter) == "undefined" || typeof(emailFilter) == "string", "Parameter emailFilter must be a string");
	assert(typeof(pageStart) == "undefined" || typeof(pageStart) == "number", "Parameter pageStart must be a Number");
	assert(typeof(pageEnd) == "undefined" || typeof(pageEnd) == "number", "Parameter pageEnd must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var query = "select * from Subject "
		+ "where (managedByRoleId  IN (" // managed subjects
		+ "select roleId "
		+ "from AssignedRole "
		+ "where subjectId = ?) "
		+ "or id = ? " // own subject
		+ "or lifecycle = 1"; // public subjects

		if (managedByRoleId) {
			query += " or managedByRoleId = ?";
		}

		query += ")";

		if (typeFilter) {
			query += " and lower(type) like ?";
		}

		if (nameFilter) {
			query += " and lower(name) like ?";
		}

		if (emailFilter) {
			query += " and lower(email) like ?";
		}

		if (pageEnd) {
			query += " LIMIT ?,?";
		}

		GPSystem.log(GPSystem.DEBUG, module.id, "query= " + query);

		stmt = con.prepareStatement(query);
		var i = 1;
		stmt.setInt(i++, subjectId);
		stmt.setInt(i++, subjectId);
		if (managedByRoleId) {
			stmt.setInt(i++, subjectId);
		}
		if (typeFilter) {
			stmt.setString(i++, "%" + typeFilter.toLowerCase() + "%");
		}
		if (nameFilter) {
			stmt.setString(i++, "%" + nameFilter.toLowerCase() + "%");
		}
		if (emailFilter) {
			stmt.setString(i++, "%" + emailFilter.toLowerCase() + "%");
		}
		if (pageEnd) {
			stmt.setInt(i++, pageStart);
			stmt.setInt(i++, pageEnd);
		}

		rs = stmt.executeQuery();
		while (rs.next()) {
			var subject = new Subject(this);
			this.factory.resultSetToProperties(rs, subject);
			list.push(subject);
		}
		GPSystem.log(GPSystem.DEBUG, module.id, "list= " + list);
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
 * Count all managed subjects that match the given criteria
 *
 * @param {Object} filter the filter criteria object
 * @type Number
 * @return the number of subjects that match the given filter
 */
SubjectDAO.prototype.countManagedSubjects = function(subjectId, managedByRoleId, typeFilter, nameFilter, emailFilter) {
	GPSystem.log(GPSystem.DEBUG, module.id, "countManagedSubjects(" + subjectId + "," + managedByRoleId + "," + typeFilter + "," + nameFilter + "," + emailFilter + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a Number");

	assert(typeof(managedByRoleId) == "undefined" || typeof(managedByRoleId) == "number", "Parameter managedByRoleId must be a Number");
	assert(typeof(typeFilter) == "undefined" || typeof(typeFilter) == "string", "Parameter typeFilter must be a string");
	assert(typeof(nameFilter) == "undefined" || typeof(nameFilter) == "string", "Parameter nameFilter must be a string");
	assert(typeof(emailFilter) == "undefined" || typeof(emailFilter) == "string", "Parameter emailFilter must be a string");

	var con = null;
	var stmt = null;
	var rs = null;

	var count = 0;

	try	{
		con = this.factory.getConnection();

		var query = "select count(1) from Subject "
		+ "where (managedByRoleId  IN (" // managed subjects
		+ "select roleId "
		+ "from AssignedRole "
		+ "where subjectId = ?) "
		+ "or id = ? " // own subject
		+ "or lifecycle = 1"; // public subjects

		if (managedByRoleId) {
			query += " or managedByRoleId = ?";
		}

		query += ")";

		if (typeFilter) {
			query += " and type like ?";
		}

		if (nameFilter) {
			query += " and name like ?";
		}

		if (emailFilter) {
			query += " and email like ?";
		}

		GPSystem.log(GPSystem.DEBUG, module.id, "query= " + query);

		stmt = con.prepareStatement(query);
		var i = 1;
		stmt.setInt(i++, subjectId);
		stmt.setInt(i++, subjectId);
		if (managedByRoleId) {
			stmt.setInt(i++, subjectId);
		}
		if (typeFilter) {
			stmt.setString(i++, "%" + typeFilter + "%");
		}
		if (nameFilter) {
			stmt.setString(i++, "%" + nameFilter + "%");
		}
		if (emailFilter) {
			stmt.setString(i++, "%" + emailFilter + "%");
		}

		rs = stmt.executeQuery();
		if (rs.next()) {
			count = rs.getInt(1);
		}
		GPSystem.log(GPSystem.DEBUG, module.id, "count= " + count);
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
 * List all subjects that match the given filter
 *
 * @param {Object} filter the filter criteria object
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type Subject[]
 * @return list of subjects
 */
SubjectDAO.prototype.listSubjectsByFilter = function(filter, offset, page) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listSubjectsByFilter(" + filter + "," + offset + "," + page + ")");

	assert(typeof(filter) == "object", "Parameter filter must be an object");
	assert(typeof(offset) == "undefined" || typeof(offset) == "number", "Parameter offset must be a Number");
	assert(typeof(page) == "undefined" || typeof(page) == "number", "Parameter page must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var stmt = this.factory.selectStatementFromFilter(con, "Subject", filter, null, offset, page);

		rs = stmt.executeQuery();
		while (rs.next()) {
			var subject = new Subject(this);
			this.factory.resultSetToProperties(rs, subject);
			list.push(subject);
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
 * Count the subjects that match the given criteria
 *
 * @param {Object} filter the filter criteria object
 * @type Number
 * @return the number of subjects that match the given filter
 */
SubjectDAO.prototype.countSubjectsByFilter = function(filter) {
	GPSystem.log(GPSystem.DEBUG, module.id, "countSubjectsByFilter(" + filter + ")");

	assert(typeof(filter) == "object", "Parameter filter must be an object");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var stmt = this.factory.selectStatementFromFilter(con, "Subject", filter, ["count(id)"]);

		rs = stmt.executeQuery();
		rs.next();
		var count = rs.getInt(1);

		GPSystem.log(GPSystem.DEBUG, module.id, "countSubjectsByFilter() returns " + count);
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
 * List all subjects for the given type
 *
 * @param {String} type the subject type, e.g. SubjectDAO.TYPE_TRUST_CENTER
 * @type Subject[]
 * @return list of subjects
 */
SubjectDAO.prototype.listSubjectsByType = function(type) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listSubjectsByType(" + type + ")");
	assert(type, "Parameter type must not be empty");
	assert(typeof(type) == "string", "Parameter type must be a string");

	var con = null;
	var stmt = null;
	var rs = null;
	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Subject where type = ?;");
		stmt.setString(1, type);

		rs = stmt.executeQuery();

		while (rs.next()) {
			var subject = new Subject(this);
			this.factory.resultSetToProperties(rs, subject);
			list.push(subject);
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
		GPSystem.log(GPSystem.DEBUG, module.id, "No subject found for type " + type);
	}
	return list;
}



/**
 * List all subject types
 *
 * @type String[]
 * @return list of subject types
 */
SubjectDAO.prototype.listSubjectTypes = function() {
	GPSystem.log(GPSystem.DEBUG, module.id, "listSubjectTypes()");

	var con = null;
	var stmt = null;
	var rs = null;
	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select distinct type from Subject;");

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

	if (list.length == 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Subjects table is empty");
	}
	return list;
}



/**
 * Update the subject's assurance level
 *
 * @param {Subject} subject the subject to update
 * @param {Number} assuranceLevel the assurance level
 */
SubjectDAO.prototype.updateAssuranceLevel = function(subject, assuranceLevel) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateAssuranceLevel(" + subject + "," + assuranceLevel + ")");

	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");
	assert(typeof(assuranceLevel) == "number", "Parameter assuranceLevel must be a Number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Subject set assuranceLevel = ? where id = ?;");

		stmt.setInt(1, assuranceLevel);
		stmt.setInt(2, subject.id);
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

	subject.assuranceLevel = assuranceLevel;
}



/**
 * Update the subject's e-mail address
 *
 * @param {Subject} subject the subject to update
 * @param {String} email the e-mail address
 */
SubjectDAO.prototype.updateEmail = function(subject, email) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateEmail(" + subject + "," + email + ")");

	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");
	assert(email, "Parameter email must not be empty");
	assert(typeof(email) == "string", "Parameter email must be a string");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Subject set email = ? where id = ?;");

		stmt.setString(1, email);
		stmt.setInt(2, subject.id);
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

	subject.email = email;
}



/**
 * Update the subject's type
 *
 * @param {Subject} subject the subject to update
 * @param {String} type the subject's type must be one of SubjectDAO.TYPE_*
 */
SubjectDAO.prototype.updateType = function(subject, type) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateType(" + subject + "," + type + ")");

	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");
	assert(type, "Parameter type must not be empty");
	assert(typeof(type) == "string", "Parameter type must be a string");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Subject set type = ? where id = ?;");

		stmt.setString(1, type);
		stmt.setInt(2, subject.id);
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

	subject.type = type;
}



/**
 * Update the Subject content
 *
 * @param {Subject} subject the subject to update
 * @param {String} content the new content
 */
SubjectDAO.prototype.updateContent = function(subject) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateContent(" + subject + ")");

	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Subject set content = ? where id = ?;");

		stmt.setString(1, subject.serialize());
		stmt.setInt(2, subject.id);
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
 * Update the Subject name
 *
 * @param {Subject} subject the subject to update
 * @param {String} name the new name
 */
SubjectDAO.prototype.updateName = function(subject, name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateName(" + subject + "," + name + ")");

	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");
	assert(typeof(name) == "string", "Parameter name must be a String");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Subject set name = ? where id = ?;");

		stmt.setString(1, name);
		stmt.setInt(2, subject.id);
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

	//subject.name = subject;
	subject.name = name;
}



/**
 * Update the Subject's manager role
 *
 * @param {Subject} subject the subject to update
 * @param {Number} roleId the manager role id
 */
SubjectDAO.prototype.updateManagedByRoleId = function(subject, roleId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateManagedByRoleId(" + subject + "," + roleId + ")");

	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");
	assert(roleId, "Parameter roleId must not be empty");
	assert(typeof(roleId) == "number", "Parameter roleId must be a number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Subject set managedByRoleId = ? where id = ?;");

		stmt.setInt(1, roleId);
		stmt.setInt(2, subject.id);
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

	subject.managedByRoleId = roleId;
}



/**
 * Update the Subject's life-cycle
 *
 * @param {Subject} subject the subject to update
 * @param {Number} lifecycle the new life-cycle
 */
SubjectDAO.prototype.updateLifeCycle = function(subject, lifecycle) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateLifeCycle(" + subject + "," + lifecycle + ")");

	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");
	assert(typeof(lifecycle) == "number", "Parameter lifecycle must be a number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Subject set lifecycle = ? where id = ?;");

		stmt.setInt(1, lifecycle);
		stmt.setInt(2, subject.id);
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

	subject.lifecycle = lifecycle;
}
