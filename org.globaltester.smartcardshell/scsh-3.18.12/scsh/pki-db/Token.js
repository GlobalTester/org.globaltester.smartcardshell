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
 * @fileoverview Token Object
 */



function Token(dao, tokenPath, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + dao + "," + tokenPath + "," + template + ")");

	this.dao = dao;

	// Must match database scheme
	this.path = tokenPath;

	if (template) {
		for (var i in template) {
			this[i] = template[i];
		}
	}
}

exports.Token = Token;



Token.prototype.toString = function() {
	var str =  "Token " + this.path;

	if (this.subjectId) {
		str += " assigned to subject" + this.subjectId;
	}

	if (this.serviceRequestId) {
		str += ", ServiceRequest=" + this.serviceRequestId;
	}

	return str;
}
