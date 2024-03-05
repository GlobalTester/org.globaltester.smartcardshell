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
 * @fileoverview Service Request State Object
 */

var SerializableBusinessObject = require('scsh/pki-db/SerializableBusinessObject').SerializableBusinessObject;

function ServiceRequestState(dao, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + dao + ")");

	this.dao = dao;

	// Must match database scheme
	this.id = 0;

	if (template) {
		for (var i in template) {
			this[i] = template[i];
		}
	}

	// Private properties
}

ServiceRequestState.prototype = Object.create(SerializableBusinessObject.prototype);
ServiceRequestState.constructor = ServiceRequestState;

exports.ServiceRequestState = ServiceRequestState;



ServiceRequestState.prototype.toString = function() {
	var str = "ServiceRequestState";
	str += "\nid [ " + this.id + " ]";
	str += "\nserviceRequestId [ " + this.serviceRequestId + " ]";
	str += "\nlifecycle [ " + this.lifecycle + " ]";
	str += "\ntransitionTime [ " + this.transitionTime + " ]";
	str += "\ncaseHandlerId [ " + this.caseHandlerId + " ]";
	str += "\ncontent [ " + this.content + " ]";

	return str;
}
