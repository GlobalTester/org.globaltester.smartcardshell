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
 * @fileoverview Subject Object
 */

var SerializableBusinessObject = require('scsh/pki-db/SerializableBusinessObject').SerializableBusinessObject;

function Subject(dao, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + dao + ")");

	this.dao = dao;

	// Must match database scheme
	this.id = 0;

	if (template) {
		for (var i in template) {
			this[i] = template[i];
		}
	}
}

Subject.prototype = Object.create(SerializableBusinessObject.prototype);
Subject.constructor = Subject;

exports.Subject = Subject;



Subject.prototype.toString = function() {
	var str = "Subject id=" + this.id;

	if (this.email) {
		str += ", email=" + this.email;
	}
	if (this.name) {
		str += ", name=" + this.name;
	}
	if (this.managedByRoleId) {
		str += ", managedByRoleId=" + this.managedByRoleId;
	}
	if (this.assuranceLevel > 0) {
		str += ", assuranceLevel=" + this.assuranceLevel;
	}

	str += ", content=" + this.content;

	return str;
}
