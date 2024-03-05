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
 * @fileoverview Signer Object
 */

var SerializableBusinessObject = require('scsh/pki-db/SerializableBusinessObject').SerializableBusinessObject;

function Signer(dao, holder, name, keyId, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + dao + "," + holder + ")");

	this.dao = dao;

	// Must match database scheme
	this.id = 0;
	if (holder) {
		this.holderId = holder.id;
	}
	this.name = name;
	this.keyId = keyId;

	if (template) {
		for (var i in template) {
			this[i] = template[i];
		}
	}

	// Private properties
	this._holder = holder;
}

Signer.prototype = Object.create(SerializableBusinessObject.prototype);
Signer.constructor = Signer;

exports.Signer = Signer;



Signer.prototype.toString = function() {
	return "Signer " + this.id;
}
