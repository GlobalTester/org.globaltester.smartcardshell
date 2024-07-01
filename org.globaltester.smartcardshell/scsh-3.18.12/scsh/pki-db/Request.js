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
 * @fileoverview Request Object
 */



function Request(dao, holder, keyId, encodedRequest, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + dao + "," + holder + "," + keyId + "," + encodedRequest + ")");

	this.dao = dao;

	// Must match database scheme
	this.id = 0;
	if (holder) {
		this.holderId = holder.id;
	}
	this.keyId = keyId;
	this.bytes = encodedRequest;

	if (template) {
		for (var i in template) {
			this[i] = template[i];
		}
	}

	// Private properties
	this._holder = holder;
}

exports.Request = Request;



Request.prototype.toString = function() {
	return "Request " + this.id;
}
