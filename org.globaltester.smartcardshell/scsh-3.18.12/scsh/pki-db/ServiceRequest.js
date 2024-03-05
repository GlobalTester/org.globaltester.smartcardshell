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
 * @fileoverview Service Request Object
 */

var SerializableBusinessObject = require('scsh/pki-db/SerializableBusinessObject').SerializableBusinessObject;

function ServiceRequest(dao, template) {
	this.dao = dao;

	// Must match database scheme
	this.id = 0;
	this.lifecycle = 1;

	if (template) {
		for (var i in template) {
			if ((i == "content") && typeof(template[i]) != "string") {
				this.setContent(template[i]);
			} else {
				this[i] = template[i];
			}
		}
	}

	// Private properties
}

ServiceRequest.prototype = Object.create(SerializableBusinessObject.prototype);
ServiceRequest.constructor = ServiceRequest;

exports.ServiceRequest = ServiceRequest;



ServiceRequest.prototype.toString = function() {
// 	return "ServiceRequest " + this.id;
	var str = "ServiceRequest";
	str += "\nid '" + this.id + "'";
	str += "\nparentServiceRequestId '" + this.parentServiceRequestId + "'";
	str += "\nprocess '" + this.process + "'";
	str += "\ndetails '" + this.details + "'";
	str += "\nstate '" + this.state + "'";
	str += "\nlifecycle '" + this.lifecycle + "'";
	str += "\noriginatorId '" + this.originatorId + "'";
	str += "\nrecipientId  '" + this.recipientId + "'";
	str += "\nassignedToRole '" + this.assignedToRole + "'";
	str += "\ncreated '" + this.created + "'";
	str += "\ncontent '" + this.content + "'";

	return str;
}
