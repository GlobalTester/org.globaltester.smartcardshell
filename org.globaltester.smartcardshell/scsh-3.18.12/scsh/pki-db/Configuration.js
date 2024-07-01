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
 * @fileoverview Configuration Object
 */



function Configuration(dao, name, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + dao + "," + name + ")");

	this.dao = dao;

	// Must match database scheme
	this.id = 0;
	this.name = name;

	if (template) {
		for (var i in template) {
			this[i] = template[i];
		}
	}

	// Private properties
}

exports.Configuration = Configuration;



Configuration.prototype.getConfigurationObject = function() {
	if (typeof(this.content) == "undefined") {
		return {};
	}

	GPSystem.log(GPSystem.DEBUG, module.id, "read config : " + this.content);
	var c = JSON.parse(this.content);
	return c;
}



Configuration.prototype.updateConfigurationObject = function(c) {
	var str = JSON.stringify(c, null, "\t");
	GPSystem.log(GPSystem.DEBUG, module.id, "update config : " + str);
	this.dao.updateContent(this, str);
}



Configuration.prototype.toString = function() {
	return "Configuration " + this.id;
}
