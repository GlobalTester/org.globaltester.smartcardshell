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
 * @fileoverview Certificate Object
 */



function Certificate(dao, holder, serial, dir, certbin, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + dao + "," + holder + "," + serial + "," + dir + "," + (certbin ? certbin.bytes(0,10).toString(HEX) : certbin) + ")");

	this.dao = dao;

	// Must match database scheme
	this.id = 0;
	if (typeof(holder) != "undefined") {
		this.holderId = holder.id;
	}
	this.serial = serial;
	this.linkDir = dir;
	this.bytes = certbin;

	if (template) {
		for (var i in template) {
			this[i] = template[i];
		}
	}

	// Private properties
	this._holder = holder;
}

exports.Certificate = Certificate;


/*
 * Select which certificate should be selected if multiple are available
 */
Certificate.UP = 0;		// Select certificate for following upstream link (e.g. CVCA-Link Certificate)
Certificate.SHORT = 1;		// Select shortest path to next self-signed certificate
Certificate.DOWN = 2;		// Select certificate for following downstream link (reverse link certificate build path to newer certificates)


Certificate.prototype.toString = function() {
	return "Certificate " + this.id;
}
