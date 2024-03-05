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
 * @fileoverview A service request stores information about a request pending service
 */

var CVC = require('scsh/eac/CVC').CVC;



/**
 * Create a new service request
 *
 * @class Class storing entries in the internal work queue
 * @constructor
 */
function BaseServiceRequest(service, messageId) {
	this.model = {};
	this.model.lifeCycle = BaseServiceRequest.LIFECYCLE_NEW;
	this.model.messageId = messageId
	this.model.type = "BaseServiceRequest";
	this.service;
}

exports.BaseServiceRequest = BaseServiceRequest;



BaseServiceRequest.LIFECYCLE_CLOSED = 0;
BaseServiceRequest.LIFECYCLE_NEW = 1;
BaseServiceRequest.LIFECYCLE_PROCESSING = 2;
BaseServiceRequest.LIFECYCLE_APPROVED = 3;
BaseServiceRequest.LIFECYCLE_COMPLETE = 4;


/**
 * Gets the unique id of the service request as defined by the database
 * The id is only available after the service request has been added to the
 * inbound / outbound queue.
 *
 * @returns the service request id as assigned by the database
 * @type String
 */
BaseServiceRequest.prototype.getId = function() {
	if (this.bo) {
		return this.bo.id;
	}

	return this.id;
}



/**
 * Gets the service request life-cycle
 *
 * @type Number
 */
BaseServiceRequest.prototype.getLifeCycle = function() {
	return this.model.lifeCycle;
}



/**
 * Sets the service request life-cycle
 *
 * @param {Number} lifeCycle the life-cycle state
 */
BaseServiceRequest.prototype.setLifeCycle = function(lifeCycle) {
	this.model.lifeCycle = lifeCycle;
}



/**
 * Gets creation time
 *
 * @returns the timestamp at which this service request was created or null
 * @type Date
 */
BaseServiceRequest.prototype.getCreationTime = function() {
	if (this.bo) {
		return this.bo.created;
	}
	return null
}



/**
 * Sets the service request type
 *
 * @param {String} type the request type
 */
BaseServiceRequest.prototype.setType = function(type) {
	this.model.type = type;
}



/**
 * Gets the service request type
 *
 * @returns the service request type
 * @type String
 */
BaseServiceRequest.prototype.getType = function() {
	return this.model.type;
}



/**
 * Add a message related to this service request
 *
 * @param {String} message the message
 */
BaseServiceRequest.prototype.addMessage = function(message) {
	if (typeof(this.model.message) == "undefined") {
		this.model.message = message;
	} else {
		this.model.message += "\n" + message;
	}
}



/**
 * Gets the status information for the last processing
 *
 * @returns the last status information which may be undefined
 * @type String
 */
BaseServiceRequest.prototype.getStatusInfo = function() {
	return this.model.statusInfo;
}



/**
 * Sets the status information for this request
 *
 * @param {String} statusInfo the last status information
 */
BaseServiceRequest.prototype.setStatusInfo = function(statusInfo) {
	GPSystem.log(GPSystem.DEBUG, module.id, "setStatusInfo(" + statusInfo + ")");
	this.model.statusInfo = statusInfo;
}



/**
 * Gets the messageId
 *
 * @returns the message id
 * @type String
 */
BaseServiceRequest.prototype.getMessageID = function() {
	return this.model.messageId;
}



/**
 * Get the originator
 *
 * @returns the originator
 * @type Subject
 */
BaseServiceRequest.prototype.getOriginator = function() {
	if (this.bo) {
		return this.bo.originatorId;
	}
	return this.originator;
}



/**
 * Gets the originator id referencing the originating subject
 *
 * @returns the originator id
 * @type String
 */
BaseServiceRequest.prototype.getOriginatorId = function() {
	return this.bo.originatorId;
}



/**
 * Gets the id of the recipient subject
 *
 * @returns the recipient id
 * @type String
 */
BaseServiceRequest.prototype.getRecipientId = function() {
	return this.bo.recipientId;
}



/**
 * Gets the id of the recipient subject
 *
 * @returns the recipient id
 * @type String
 */
BaseServiceRequest.prototype.getRecipient = function() {
	var subjectDAO = this.service.daof.getSubjectDAO();
	return subjectDAO.getSubject(this.bo.recipientId);
}



/**
 * Returns true if this is a locally generated request
 *
 * @returns true if this is a locally generated request, i.e. has no recipientId
 * @type boolean
 */
BaseServiceRequest.prototype.isLocallyCreated = function() {
	return (this.bo.originatorId != null) && (this.bo.recipientId == null);
}



BaseServiceRequest.prototype.isCertificateRequest = function() {
	return false
}



/**
 * Check if the subject is authorized to process the service request.
 * A subject is authorized if service request and subject are assigned to the same role.
 *
 * @returns true if the subject is authorized, false otherwise
 * @type boolean
 */
BaseServiceRequest.prototype.isAuthorizedSubject = function(subjectId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "isAuthorizedSubject(" + subjectId + ")");

	if (!this.bo || !this.bo.assignedToRole) {
		GPSystem.log(GPSystem.DEBUG, module.id, "service request " + this + " is not assigned to a role");
		return false;
	}
	var roleDAO = this.service.daof.getRoleDAO();
	var roles = roleDAO.getAssignedRoles(subjectId);
	for (var i = 0; i < roles.length; i++) {
		if (roles[i].id == this.bo.assignedToRole) {
			GPSystem.log(GPSystem.DEBUG, module.id, "subject is authorized for service request " + this);
			return true;
		}
	}
	GPSystem.log(GPSystem.DEBUG, module.id, subjectId + " is not authorized for service request " + this);
	return false;
}


/**
 * Remove properties that are not serialized.
 *
 * @private
 */
BaseServiceRequest.JSONReplacer = function(key, value) {
	if (key == "bo") {
		return undefined;
	}
	if (key == "relatedBaseServiceRequest") {
		return undefined;
	}
	return value;
}



/**
 * Serialize service request into JSON object
 */
BaseServiceRequest.prototype.serialize = function() {
	return JSON.stringify(this.model, BaseServiceRequest.JSONReplacer, '\t');
}



/**
 * Recreate embedded objects
 *
 * @private
 */
BaseServiceRequest.JSONReviver = function(key, value) {
//	GPSystem.trace(key + ":" + value);

	if (value && value.clazz) {
//		print("Clazz " + value.clazz);
		switch(value.clazz) {
			case "ByteString": value = ByteString.fromJSON(value); break;
			case "CVC":        value = CVC.fromJSON(value); break;
		}
	}
	return value;
}



/**
 * Deserialize service request from JSON encoded string
 *
 * @param {String} str the JSON object as string
 */
BaseServiceRequest.deserialize = function(str) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deserialize " + str);
	var sr = Object.create(BaseServiceRequest.prototype);
	sr.model = [];
	sr.model.lifeCycle = BaseServiceRequest.LIFECYCLE_NEW;

//	print(str);
	var o = JSON.parse(str,BaseServiceRequest.JSONReviver);

	for (var i in o) {
		sr.model[i] = o[i];
	}
	return sr;
}



/**
 * Commit changes to the ServiceRequest object
 */
BaseServiceRequest.prototype.commit = function() {
	var srDAO = this.service.daof.getServiceRequestDAO();

	if (!this.bo) { // Create new business object

		var t = {
			process: this.model.type,
			content: this.serialize(),
		};

		if (this.originator) {
			t.originatorId = this.originator.id;
		}

		if (this.recipient) {
			t.recipientId = this.recipient.id;
		}

		this.bo = srDAO.newServiceRequest(t);
	} else {
		srDAO.updateContent(this.bo, this.serialize());
	}
}



/**
 * Create a describing string
 *
 * @returns the string
 * @type String
 */
BaseServiceRequest.prototype.toString = function() {
	var str;
	if (this.bo) {
		str = this.bo.process;
	} else {
		str = this.getType();
	}

	for (var obj in this.model) {
		str += "\n" + obj + "[ " + this.model[obj] + " ]";
	}

	return str;
}
