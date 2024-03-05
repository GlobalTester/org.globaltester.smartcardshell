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
 * @fileoverview DAO Factory for file system based persistence
 */

var Role = require('scsh/pki-db/Role').Role;
var Subject = require('scsh/pki-db/Subject').Subject;


/**
 * Data access object for service requests
 *
 * @param {Object} the factory that created this DAO
 */
function RoleDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.RoleDAO = RoleDAO;


RoleDAO.createRole = [
"CREATE TABLE IF NOT EXISTS Role (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	name VARCHAR(100) NOT NULL," +
"	managingRoleId MEDIUMINT UNSIGNED REFERENCES Role(id)," +
"	requiresApproval SMALLINT NOT NULL DEFAULT 0," +
"	PRIMARY KEY (id)," +
"	UNIQUE (name)" +
");"
// ,"INSERT INTO Role (name) values ('God');"
];

RoleDAO.createAssignedRole =
"CREATE TABLE IF NOT EXISTS AssignedRole (" +
"	subjectId MEDIUMINT UNSIGNED NOT NULL REFERENCES Subject(id)," +
"	roleId MEDIUMINT UNSIGNED NOT NULL REFERENCES Role(id)," +
"	serviceRequestId MEDIUMINT UNSIGNED REFERENCES ServiceRequest(id)," +
"	PRIMARY KEY (subjectId, roleId)" +
");";

RoleDAO.dropRole = "DROP TABLE IF EXISTS Role;";
RoleDAO.dropAssignedRole = "DROP TABLE IF EXISTS AssignedRole;";



/**
 * Create and persists a new role
 *
 * @param {String} name the name of the role
 * @param {Number} managingRoleId the id of the managing role (optional)
 * @type Role
 * @return the newly created role object
 */
RoleDAO.prototype.newRole = function(name, managingRoleId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newRole(" + name + ", " + managingRoleId + ")");

	assert(name, "Parameter name must not be empty");
	assert(typeof(name) == "string", "Parameter name must be a String");

	var role = new Role(this, name, managingRoleId);

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "Role", role);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		role.id = rs.getInt(1);

		if (!managingRoleId) {
			role.managingRoleId = role.id;

			stmt.close();

			stmt = con.prepareStatement("update Role set managingRoleId = ? where id = ?;");
			stmt.setInt(1, role.id);
			stmt.setInt(2, role.id);
			stmt.executeUpdate();
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



	return role;
}



RoleDAO.ID_SystemAdmin = 1;
RoleDAO.ID_HSMAdmin = 2;
RoleDAO.ID_Auditor = 3;
RoleDAO.ID_SubscriberManager = 4;
RoleDAO.ID_Subscriber = 5;
RoleDAO.ID_RegistrationManager = 6;

RoleDAO.prototype.createPredefinedRoles = function() {
	GPSystem.log(GPSystem.DEBUG, module.id, "createPredefinedRoles()");

	if (this.getRoleById(1) != null) {
		return;
	}

	this.newRole("SystemAdmin");					// Id 1
	this.newRole("HSMAdmin");					// Id 2
	this.newRole("Auditor");					// Id 3
	this.newRole("SubscriberManager");				// Id 4
	this.newRole("Subscriber", RoleDAO.ID_SubscriberManager);	// Id 5
	this.newRole("RegistrationManager");				// Id 6
	for (var i = 7; i < 100; i++) {					// Id 7 to Id 99 reserved
		this.newRole("Role" + i);
	}
}



/**
 * Get the role object
 *
 * @param {String} name the role's name
 * @type Role
 * @return the role or null
 */
RoleDAO.prototype.getRole = function(name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getRole(" + name + ")");

	assert(name, "Parameter name must not be empty");
	assert(typeof(name) == "string", "Parameter name must be a string");

	var con = null;
	var stmt = null;
	var rs = null;
	var role = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Role where name = ?;");
		stmt.setString(1, name);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No role with name " + name + " found");
			return null;
		}

		role = new Role(this);
		this.factory.resultSetToProperties(rs, role);
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

	return role;
}



/**
 * Get the role object
 *
 * @param {Number} id the role's id
 * @type Role
 * @return the role or null
 */
RoleDAO.prototype.getRoleById = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getRoleById(" + id + ")");

	assert(id, "Parameter id must not be empty");
	assert(typeof(id) == "number", "Parameter id must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var role = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Role where id = ?;");
		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No role found for id " + id);
			return null;
		}

		role = new Role(this);
		this.factory.resultSetToProperties(rs, role);
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

	return role;
}



/**
 * Create and persists a new relation which assignes a role to a subject
 *
 * @param {Number} subjectId the subject the role will be assigned to
 * @param {Number} roleId the role to be assigned
 */
RoleDAO.prototype.newAssignedRole = function(subjectId, roleId, serviceRequestId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newAssignedRole(" + subjectId + "," + roleId + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");
	assert(typeof(roleId) == "number", "Parameter roleId must be a number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		var obj = {
			subjectId: subjectId,
			roleId: roleId
		};
		if (serviceRequestId) {
			obj.serviceRequestId = serviceRequestId;
		}

		stmt = this.factory.insertStatementFromObject(con, "AssignedRole", obj);

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
 * Delete an assigned role
 *
 * @param {Number} subjectId the subject the role was assigned to
 * @param {Number} roleId the role to be removed
 */
RoleDAO.prototype.deleteAssignedRole = function(subjectId, roleId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newAssignedRole(" + subjectId + "," + roleId + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");
	assert(typeof(roleId) == "number", "Parameter roleId must be a number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		var sql = "DELETE FROM AssignedRole "
			+ "WHERE subjectId = ? AND roleId = ?"
		stmt = con.prepareStatement(sql);
		stmt.setInt(1, subjectId);
		stmt.setInt(2, roleId);

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
 * Get all roles that are managed by the given subject
 *
 * @param {Subject} subject the assigned subjet
 * @type Role[]
 * @return the list of roles
 */
RoleDAO.prototype.getManagedRoles = function(subjectId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getManagedRoles(" + subjectId + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var roles = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("SELECT id, name, managingRoleId FROM AssignedRole join Role on (roleId = managingRoleId) WHERE subjectId = ?");
		stmt.setInt(1, subjectId);
		rs = stmt.executeQuery();

		while (rs.next()) {
			var id = rs.getInt(1);
			var name = rs.getString(2);
			var managingRoleId = rs.getInt(3);
			var role = new Role(this, name, managingRoleId);
			role.id = id;
			if (role) {
				roles.push(role);
			}
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

	if (roles.length == 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "No role managed by subject " + subjectId);
	}
	return roles;
}



/**
 * Get all roles assigned to the given subject
 *
 * @param {Subject} subject the assigned subjet
 * @type Role[]
 * @return the list of roles
 */
RoleDAO.prototype.getAssignedRoles = function(subjectId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getAssignedRole(" + subjectId + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var roles = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select roleId, serviceRequestId from AssignedRole where subjectId= ?;");
		stmt.setInt(1, subjectId);

		rs = stmt.executeQuery();

		while (rs.next()) {
			var role = this.getRoleById(rs.getInt(1));
			if (role) {
				role.serviceRequestId = rs.getInt(2);
				roles.push(role);
			}
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

	if (roles.length == 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "No role assigned to subject " + subjectId);
	}
	return roles;
}



/**
 * Get all roles ids assigned to the given subject
 *
 * @param {Subject} subject the assigned subjet
 * @type Number[]
 * @return the list of roles ids
 */
RoleDAO.prototype.getAssignedRoleIds = function(subjectId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getAssignedRoleIds(" + subjectId + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var roles = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select roleId from AssignedRole where subjectId= ?;");
		stmt.setInt(1, subjectId);

		rs = stmt.executeQuery();

		while (rs.next()) {
			roles.push(rs.getInt(1));
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

	if (roles.length == 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "No role assigned to subject " + subjectId);
	}
	return roles;
}



/**
 * Get all subjects assigned to the given role
 *
 * @param {Role} role the assigned role
 * @type Subject[]
 * @return the list of assigned subjects
 */
RoleDAO.prototype.getAssignedSubject = function(roleId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getAssignedSubjects(" + roleId + ")");

	assert(typeof(roleId) == "number", "Parameter roleId must be a number");

	var con = null;
	var stmt = null;
	var rs = null;
	var subjects = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select subjectId from AssignedRole where roleId= ?;");
		stmt.setInt(1, roleId);

		rs = stmt.executeQuery();
		var subjectDAO = this.factory.getSubjectDAO();

		while (rs.next()) {

			var subject = subjectDAO.getSubject(rs.getInt(1));
			if (subject) {
				subjects.push(subject);
			}
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

	if (subjects.length == 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "No subjects assigned to role " + role);
	}
	return subjects;
}
