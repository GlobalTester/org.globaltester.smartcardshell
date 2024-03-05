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
 * @fileoverview DAO Factory for file system based persistence
 */

var ServiceRequest = require('scsh/pki-db/ServiceRequest').ServiceRequest;
var ServiceRequestState = require('scsh/pki-db/ServiceRequestState').ServiceRequestState;
var Subject = require('scsh/pki-db/Subject').Subject;



/**
 * Data access object for service requests
 *
 * @param {Object} the factory that created this DAO
 */
function ServiceRequestDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.ServiceRequestDAO = ServiceRequestDAO;



ServiceRequestDAO.create = [
"CREATE TABLE IF NOT EXISTS ServiceRequest (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	parentServiceRequestId MEDIUMINT UNSIGNED REFERENCES ServiceRequest(id)," +
"	process VARCHAR(250)," +
"	title VARCHAR(250)," +
"	details VARCHAR(250)," +
"	state VARCHAR(250)," +
"	lifecycle MEDIUMINT NOT NULL DEFAULT 1," +
"	originatorId MEDIUMINT UNSIGNED REFERENCES Subject(id)," +
"	recipientId MEDIUMINT UNSIGNED REFERENCES Subject(id)," +
"	messageId VARCHAR(250)," +
"	assignedToRole MEDIUMINT UNSIGNED REFERENCES Role(id)," +
"	created TIMESTAMP DEFAULT NOW()," +
"	due TIMESTAMP NULL," +
"	content LONGTEXT," +
"	PRIMARY KEY (id)," +
"	FOREIGN KEY (parentServiceRequestId) REFERENCES ServiceRequest(id)," +
"	FOREIGN KEY (originatorId) REFERENCES Subject(id)," +
"	FOREIGN KEY (recipientId) REFERENCES Subject(id)" +
")",
"CREATE TABLE IF NOT EXISTS ServiceRequestState (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	serviceRequestId MEDIUMINT UNSIGNED REFERENCES ServiceRequest(id)," +
"	lifecycle MEDIUMINT NOT NULL," +
"	state VARCHAR(250)," +
"	transitionTime TIMESTAMP DEFAULT NOW()," +
"	caseHandlerId MEDIUMINT UNSIGNED REFERENCES Subject(id)," +
"	content LONGTEXT," +
"	PRIMARY KEY (id)," +
"	FOREIGN KEY (serviceRequestId) REFERENCES ServiceRequest(id)," +
"	FOREIGN KEY (caseHandlerId) REFERENCES Subject(id)" +
")"
];

ServiceRequestDAO.drop = [
"DROP TABLE IF EXISTS ServiceRequestState",
"DROP TABLE IF EXISTS ServiceRequest"
]



ServiceRequestDAO.prototype.toString = function() {
	return "ServiceRequestDAO(db)";
}



/**
 * Create and persists a new service request
 *
 * @type ServiceRequest
 * @return the newly created service request object
 */
ServiceRequestDAO.prototype.newServiceRequest = function(template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newServiceRequest()");

	var sr = new ServiceRequest(this, template);

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "ServiceRequest", sr);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		sr.id = rs.getInt(1);
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

	return sr;
}



/**
 * Get service request identified by id
 *
 * @param {Number} id the id
 * @type ServiceRequest
 * @return the service request or null if not found
 */
ServiceRequestDAO.prototype.getServiceRequestById = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getServiceRequestById(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from ServiceRequest where id = ?");
		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "id " + id + " not found");
			return null;
		}
		var serviceRequest = new ServiceRequest(this);
		this.factory.resultSetToProperties(rs, serviceRequest);
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

	return serviceRequest;
}



/**
 * Get service request identified by originator and messageId
 *
 * @param {String} originator the originator
 * @param {String} messageId the messageId
 * @type ServiceRequest
 * @return the service request or null if not found
 */
ServiceRequestDAO.prototype.getServiceRequestByOriginatorAndMessageId = function(originator, messageId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getServiceRequestById(" + originator + "," + messageId + ")");

	assert(typeof(originator) == "string", "Parameter originator must be a String");
	assert(typeof(messageId) == "string", "Parameter messageId must be a String");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from ServiceRequest where originator = ? and messageId = ?");
		stmt.setString(1, originator);
		stmt.setString(2, messageId);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "messageId " + messageId + " for " + originator + " not found");
			return null;
		}
		var serviceRequest = new ServiceRequest(this);
		this.factory.resultSetToProperties(rs, serviceRequest);
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

	return serviceRequest;
}



/**
 * Get service requests for given originator
 *
 * @param {String} originator the originator
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type ServiceRequest[]
 * @return the list of service requests which may be empty
 */
ServiceRequestDAO.prototype.listServiceRequestsByOriginator = function(originator, offset, page) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listServiceRequestsByOriginator(" + originator + "," + offset + "," + page + ")");

	assert(typeof(originator) == "string", "Parameter originator must be a String");
	assert(typeof(offset) == "undefined" || typeof(offset) == "number", "Parameter offset must be a Number");
	assert(typeof(page) == "undefined" || typeof(page) == "number", "Parameter page must be a Number");

	var filter = { originator: originator };
	return this.listServiceRequestsByFilter(filter, offset, page);
}



/**
 * Get service requests for given recipient
 *
 * @param {String} recipient the recipient
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type ServiceRequest[]
 * @return the list of service requests which may be empty
 */
ServiceRequestDAO.prototype.listServiceRequestsByRecipient = function(recipient, offset, page) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listServiceRequestsByRecipient(" + recipient + "," + offset + "," + page + ")");

	assert(typeof(recipient) == "string", "Parameter recipient must be a String");
	assert(typeof(offset) == "undefined" || typeof(offset) == "number", "Parameter offset must be a Number");
	assert(typeof(page) == "undefined" || typeof(page) == "number", "Parameter page must be a Number");

	var filter = { recipient: recipient };
	return this.listServiceRequestsByFilter(filter, offset, page);
}



/**
 * Get list of service requests that match the given criteria
 *
 * @param {Object} filter the filter criteria object
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type ServiceRequest[]
 * @return the list of service requests which may be empty
 */
ServiceRequestDAO.prototype.listServiceRequestsByFilter = function(filter, offset, page) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listServiceRequestsByFilter(" + filter + "," + offset + "," + page + ")");

	assert(typeof(filter) == "object", "Parameter filter must be an object");
	assert(typeof(offset) == "undefined" || typeof(offset) == "number", "Parameter offset must be a Number");
	assert(typeof(page) == "undefined" || typeof(page) == "number", "Parameter page must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var stmt = this.factory.selectStatementFromFilter(con, "ServiceRequest", filter, null, offset, page);

		rs = stmt.executeQuery();
		while (rs.next()) {
			var serviceRequest = new ServiceRequest(this);
			this.factory.resultSetToProperties(rs, serviceRequest);
			list.push(serviceRequest);
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
 * Get list of service requests that are related to the given service request
 *
 * @param {Number} id the service request id
 * @type ServiceRequest[]
 * @return the list of service requests which may be empty
 */
ServiceRequestDAO.prototype.listRelatedServiceRequests = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listRelatedServiceRequests(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from ServiceRequest where parentServiceRequestId = ?;");

		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		while (rs.next()) {
			var serviceRequest = new ServiceRequest(this);
			this.factory.resultSetToProperties(rs, serviceRequest);
			list.push(serviceRequest);
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
 * Return all service request states for a given service request
 *
 * @param {Number} id the service request id
 * @type ServiceRequestState[]
 * @return the list of service request states that belongs to the service request id
 */
ServiceRequestDAO.prototype.listServiceRequestStates = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listServiceRequestStates(" + id + ")");
	var con = null;
	var stmt = null;
	var rs = null;
	var states = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from ServiceRequestState where serviceRequestId = ?");
		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		while (rs.next()) {
			var srState = new ServiceRequestState(this);
			this.factory.resultSetToProperties(rs, srState);
			states.push(srState);
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
	if (states.length == 0) {
		GPSystem.log(GPSystem.DEBUG, module.id, "No ServiceRequestState found for serviceRequestId " + id);
	}

	return states;
}


/**
 * Count the service requests that match the given criteria
 *
 * @param {Object} filter the filter criteria object
 * @type Number
 * @return the number of service requests that match the given filter
 */
ServiceRequestDAO.prototype.countServiceRequestsByFilter = function(filter) {
	GPSystem.log(GPSystem.DEBUG, module.id, "countServiceRequestsByFilter(" + filter + ")");

	assert(typeof(filter) == "object", "Parameter filter must be an object");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var stmt = this.factory.selectStatementFromFilter(con, "ServiceRequest", filter, ["count(id)"]);

		rs = stmt.executeQuery();
		rs.next();
		var count = rs.getInt(1);

		GPSystem.log(GPSystem.DEBUG, module.id, "countServiceRequestsByFilter() returns " + count);
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
 * Get list of service requests that match the given criteria and are assigned to a role the
 * subject holds.
 *
 * @param {Number} subjectId the subject id of the subject in question
 * @param {Object} filter the filter criteria object
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type ServiceRequest[]
 * @return the list of service requests which may be empty.
 */
ServiceRequestDAO.prototype.listServiceRequestsAssignedToSubjectsRoleByFilter = function(subjectId, filter, offset, page) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listServiceRequestsAssignedToSubjectsRoleByFilter(" + subjectId + "," + filter + "," + offset + "," + page + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");
	assert(typeof(filter) == "object", "Parameter filter must be an object");
	assert(typeof(offset) == "undefined" || typeof(offset) == "number", "Parameter offset must be a Number");
	assert(typeof(page) == "undefined" || typeof(page) == "number", "Parameter page must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var where = this.factory.whereClauseFromFilter(filter);

		if (where.length > 0) {
			where += " and";
		}

		where += " assignedToRole in (select roleId from AssignedRole where subjectId = ?)";
		if (page) {
			where += " limit ?,?";
		}
//		stmt = con.prepareStatement("select id,process,state,originatorId,recipientId,messageId,assignedToRole,created,due from ServiceRequest where " + where);

		GPSystem.log(GPSystem.DEBUG, module.id, "select * from ServiceRequest where " + where);
		stmt = con.prepareStatement("select * from ServiceRequest where " + where);

		var paramOffset = this.factory.setArgumentsFromFilter(stmt, 1, filter);
		stmt.setInt(paramOffset++, subjectId);
		if (page) {
			stmt.setInt(paramOffset++, offset);
			stmt.setInt(paramOffset, page);
		}

		rs = stmt.executeQuery();
		GPSystem.log(GPSystem.DEBUG, module.id, "sr list: " + list);
		while (rs.next()) {
			var serviceRequest = new ServiceRequest(this);
			this.factory.resultSetToProperties(rs, serviceRequest);
			list.push(serviceRequest);
			GPSystem.log(GPSystem.DEBUG, module.id, "add sr " + serviceRequest.id + " to list");
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

	GPSystem.log(GPSystem.DEBUG, module.id, "sr list: " + list);
	return list;
}



/**
 * Get list of service requests that match the given criteria and where the subject was involved
 *
 * @param {Number} subjectId the subject id of the subject in question
 * @param {Object} filter the filter criteria object
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type ServiceRequest[]
 * @return the list of service requests which may be empty.
 */
ServiceRequestDAO.prototype.listServiceRequestsInvolvedBySubject = function(subjectId, filter, offset, page) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listServiceRequestsInvolvedBySubject(" + subjectId + "," + filter + "," + offset + "," + page + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");
	assert(typeof(filter) == "object", "Parameter filter must be an object");
	assert(typeof(offset) == "undefined" || typeof(offset) == "number", "Parameter offset must be a Number");
	assert(typeof(page) == "undefined" || typeof(page) == "number", "Parameter page must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var where = this.factory.whereClauseFromFilter(filter);

		if (where.length > 0) {
			where += " and";
		}

		where += " id in (select distinct serviceRequestId from ServiceRequestState where caseHandlerId = ?)";
		stmt = con.prepareStatement("select * from ServiceRequest where " + where);

		var offset = this.factory.setArgumentsFromFilter(stmt, 1, filter);
		stmt.setInt(offset, subjectId);

		rs = stmt.executeQuery();
		while (rs.next()) {
			var serviceRequest = new ServiceRequest(this);
			this.factory.resultSetToProperties(rs, serviceRequest);
			list.push(serviceRequest);
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
 * Get list of service requests that match the given criteria and where the subject was involved
 *
 * @param {Number} subjectId the subject id of the subject in question
 * @param {Object} filter the filter criteria object
 * @param {Number} pageOffset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 * @type ServiceRequest[]
 * @return the list of service requests which may be empty.
 */
ServiceRequestDAO.prototype.listServiceRequests = function(subjectId, filter, pageOffset, page) {
	GPSystem.log(GPSystem.DEBUG, module.id, "listServiceRequests(" + subjectId + "," + pageOffset + "," + page + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");
	assert(typeof(filter) == "object", "Parameter filter must be an object");
	assert(typeof(pageOffset) == "undefined" || typeof(pageOffset) == "number", "Parameter pageOffset must be a Number");
	assert(typeof(page) == "undefined" || typeof(page) == "number", "Parameter page must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var where = this.factory.whereClauseFromFilter(filter);

		if (where.length > 0) {
			where += " and";
		}

		// my service requests
		where += " (originatorId = ?";

		// assigned to me
		where += " or assignedToRole in (select roleId from AssignedRole where subjectId = ?) ";

		// involves me
		where += " or id in (select distinct serviceRequestId from ServiceRequestState where caseHandlerId = ?))";

		if (page) {
			where += " limit ?,?";
		}

		stmt = con.prepareStatement("select * from ServiceRequest where " + where);

		var offset = this.factory.setArgumentsFromFilter(stmt, 1, filter);
		stmt.setInt(offset++, subjectId); // set originatorId
		stmt.setInt(offset++, subjectId); // set assigned roles to subjectId
		stmt.setInt(offset++, subjectId); // set caseHandlerId

		if (page) {
			stmt.setInt(offset++, pageOffset);
			stmt.setInt(offset, page);
		}

		rs = stmt.executeQuery();
		while (rs.next()) {
			var serviceRequest = new ServiceRequest(this);
			this.factory.resultSetToProperties(rs, serviceRequest);
			list.push(serviceRequest);
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
 * Count the service requests that match the given criteria and where the subject was involved
 *
 * @param {Number} subjectId the subject id of the subject in question
 * @param {Object} filter the filter criteria object
 * @type {Number
 * @return the number of service requests that match the given criteria and where the subject was involved
 */
ServiceRequestDAO.prototype.countServiceRequests = function(subjectId, filter) {
	GPSystem.log(GPSystem.DEBUG, module.id, "countServiceRequests(" + subjectId + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");
	assert(typeof(filter) == "object", "Parameter filter must be an object");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var where = this.factory.whereClauseFromFilter(filter);

		if (where.length > 0) {
			where += " and";
		}

		// my service requests
		where += " (originatorId = ?";

		// assigned to me
		where += " or assignedToRole in (select roleId from AssignedRole where subjectId = ?) ";

		// involves me
		where += " or id in (select distinct serviceRequestId from ServiceRequestState where caseHandlerId = ?))";

		stmt = con.prepareStatement("select count(id) from ServiceRequest where " + where);

		var offset = this.factory.setArgumentsFromFilter(stmt, 1, filter);
		stmt.setInt(offset++, subjectId); // set originatorId
		stmt.setInt(offset++, subjectId); // set roles
		stmt.setInt(offset, subjectId); // set caseHandlerId

		rs = stmt.executeQuery();
		rs.next();
		var count = rs.getInt(1);
		GPSystem.log(GPSystem.DEBUG, module.id, "countServiceRequests() returns " + count);
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
 * Count the service requests assigned to a role that the identified subject holds and that matches the given criteria
 *
 * @param {Number} subjectId the subject id of the subject in question
 * @param {Object} filter the filter criteria object
 * @type Number
 * @return the number of service requests that match the given filter
 */
ServiceRequestDAO.prototype.countServiceRequestsAssignedToSubjectsRoleByFilter = function(subjectId, filter) {
	GPSystem.log(GPSystem.DEBUG, module.id, "countServiceRequestsAssignedToSubjectsRoleByFilter(" + subjectId + "," + filter + ")");

	assert(typeof(subjectId) == "number", "Parameter subjectId must be a number");
	assert(typeof(filter) == "object", "Parameter filter must be an object");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		var where = this.factory.whereClauseFromFilter(filter);

		if (where.length > 0) {
			where += " and";
		}

		where += " assignedToRole in (select roleId from AssignedRole where subjectId = ?)";
		stmt = con.prepareStatement("select count(id) from ServiceRequest where " + where);

		var offset = this.factory.setArgumentsFromFilter(stmt, 1, filter);
		stmt.setInt(offset, subjectId);

		rs = stmt.executeQuery();
		rs.next();
		var count = rs.getInt(1);
		GPSystem.log(GPSystem.DEBUG, module.id, "countServiceRequestsAssignedToSubjectsRoleByFilter() returns " + count);
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
 * Get a list of all processes
 *
 * @type String[]
 * @return the process list
 */
ServiceRequestDAO.prototype.getProcessList = function() {
	GPSystem.log(GPSystem.DEBUG, module.id, "getProcessList()");

	var con = null;
	var stmt = null;
	var rs = null;

	var list = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select distinct process from ServiceRequest");

		rs = stmt.executeQuery();

		while (rs.next()) {
			list.push(rs.getString(1));
		}
	} finally {
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
 * Update the Service Request title
 *
 * @param {ServiceRequest} serviceRequest the serviceRequest to update
 * @param {String} title the new title
 */
ServiceRequestDAO.prototype.updateTitle = function(serviceRequest, title) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateTitle(" + serviceRequest + "," + title + ")");

	assert(serviceRequest, "Parameter serviceRequest must not be empty");
	assert(serviceRequest instanceof ServiceRequest, "Parameter must be instance of ServiceRequest");
	assert(typeof(title) == "string", "Parameter title must be a String");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update ServiceRequest set title = ? where id = ?;");

		stmt.setString(1, title);
		stmt.setInt(2, serviceRequest.id);
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

	serviceRequest.title = title;
}



/**
 * Update the Service Request details
 *
 * @param {ServiceRequest} serviceRequest the serviceRequest to update
 * @param {String} details the new details
 */
ServiceRequestDAO.prototype.updateDetails = function(serviceRequest, details) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateDetails(" + serviceRequest + "," + details + ")");

	assert(serviceRequest, "Parameter serviceRequest must not be empty");
	assert(serviceRequest instanceof ServiceRequest, "Parameter must be instance of ServiceRequest");
	assert(typeof(details) == "string", "Parameter details must be a String");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update ServiceRequest set details = ? where id = ?;");

		stmt.setString(1, details);
		stmt.setInt(2, serviceRequest.id);
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

	serviceRequest.details = details;
}



/**
 * Update the Service Request content
 *
 * @param {ServiceRequest} serviceRequest the serviceRequest to update
 * @param {String} content the new content
 */
ServiceRequestDAO.prototype.updateContent = function(serviceRequest, content) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateContent(" + serviceRequest + "," + content + ")");

	assert(serviceRequest, "Parameter serviceRequest must not be empty");
	assert(serviceRequest instanceof ServiceRequest, "Parameter must be instance of ServiceRequest");

	if (typeof(content) != "undefined") {
		assert(typeof(content) == "string", "Parameter val must be a String");
	} else {
		content = serviceRequest.serialize();
	}

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update ServiceRequest set content = ? where id = ?;");

		stmt.setString(1, content);
		stmt.setInt(2, serviceRequest.id);
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

	serviceRequest.content = content;
}



/**
 * Update the Service Request state, lifecycle and content
 *
 * @param {ServiceRequest} serviceRequest the serviceRequest to update
 * @param {Object} template to initialize caseHandlerId and content column in ServiceRequestState
 */
ServiceRequestDAO.prototype.addLifeCycleTransition = function(serviceRequest, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "addLifeCycleTransition(" + serviceRequest + "," + template + ")");

	assert(serviceRequest, "Parameter serviceRequest must not be empty");
	assert(serviceRequest instanceof ServiceRequest, "Parameter must be instance of ServiceRequest");

	assert(template, "Parameter template must not be empty");
	assert(typeof(template) == "object", "Parameter template must be a object");

	var content = serviceRequest.serialize();

	var srstate = new ServiceRequestState(this, template);

	srstate.serviceRequestId = serviceRequest.id;
	srstate.lifecycle = serviceRequest.lifecycle;
	srstate.state = serviceRequest.state;

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();
		con.setAutoCommit(false);

		stmt = this.factory.insertStatementFromObject(con, "ServiceRequestState", srstate);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		srstate.id = rs.getInt(1);

		stmt = con.prepareStatement("update ServiceRequest set state = ?,lifecycle = ?, assignedToRole = ?, content = ? where id = ?;");

		stmt.setString(1, serviceRequest.state);
		stmt.setInt(2, serviceRequest.lifecycle);
		if (serviceRequest.assignedToRole) {
			stmt.setInt(3, serviceRequest.assignedToRole);
		} else {
			stmt.setNull(3, java.sql.Types.INTEGER);
		}
		stmt.setString(4, content);
		stmt.setInt(5, serviceRequest.id);
		stmt.executeUpdate();
		con.commit();
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.setAutoCommit(true);
			con.close();
		}
	}

	return srstate;
}



/**
 * Update the Service Request state and lifecycle
 *
 * @param {ServiceRequest} serviceRequest the serviceRequest to update
 */
ServiceRequestDAO.prototype.updateState = function(serviceRequest) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateState(" + serviceRequest + ")");

	assert(serviceRequest, "Parameter serviceRequest must not be empty");
	assert(serviceRequest instanceof ServiceRequest, "Parameter must be instance of ServiceRequest");

	var con = null;
	var stmt = null;

	try     {
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update ServiceRequest set state = ?,lifecycle = ? where id = ?;");

		stmt.setString(1, serviceRequest.state);
		stmt.setInt(2, serviceRequest.lifecycle);
		stmt.setInt(3, serviceRequest.id);
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
 * Update the Service Request originator id
 *
 * @param {ServiceRequest} serviceRequest the serviceRequest to update
 * @param {Subject} subject the originator
 */
ServiceRequestDAO.prototype.updateOriginatorId = function(serviceRequest, subject) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateOriginatorId(" + serviceRequest + "," + subject + ")");

	assert(serviceRequest, "Parameter serviceRequest must not be empty");
	assert(serviceRequest instanceof ServiceRequest, "Parameter must be instance of ServiceRequest");
	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update ServiceRequest set originatorId = ? where id = ?;");

		stmt.setInt(1, subject.id);
		stmt.setInt(2, serviceRequest.id);
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

	serviceRequest.originatorId = subject.id;
}



/**
 * Update the Service Request recipient id
 *
 * @param {ServiceRequest} serviceRequest the serviceRequest to update
 * @param {Subject} subject the recipient
 */
ServiceRequestDAO.prototype.updateRecipientId = function(serviceRequest, subject) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateRecipientId(" + serviceRequest + "," + subject + ")");

	assert(serviceRequest, "Parameter serviceRequest must not be empty");
	assert(serviceRequest instanceof ServiceRequest, "Parameter must be instance of ServiceRequest");
	assert(subject, "Parameter subject must not be empty");
	assert(subject instanceof Subject, "Parameter must be instance of Subject");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update ServiceRequest set recipientId = ? where id = ?;");

		stmt.setInt(1, subject.id);
		stmt.setInt(2, serviceRequest.id);
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

	serviceRequest.recipientId = subject.id;
}



/**
 * Delete Service Request
 *
 * @param {ServiceRequest} serviceRequest the serviceRequest to delete
 * @type boolean
 * @return true if deleted
 */
ServiceRequestDAO.prototype.deleteServiceRequest = function(serviceRequest) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteServiceRequest(" + serviceRequest + ")");

	assert(serviceRequest, "Parameter serviceRequest must not be empty");
	assert(serviceRequest instanceof ServiceRequest, "Parameter must be instance of ServiceRequest");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from ServiceRequest where id = ?;");

		stmt.setInt(1, serviceRequest.id);
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
