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
 * @fileoverview Holder Object
 */



function Holder(dao, path, certtype, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + dao + "," + path + "," + certtype + ")");

	this.dao = dao;

	// Must match database scheme
	this.id = 0;
	if (path) {
		this.name = path.substr(path.lastIndexOf("/") + 1);
	}
	this.certificateType = certtype;

	this.signerNo = 0;

	if (template) {
		for (var i in template) {
			this[i] = template[i];
		}
	}

	// Private properties
	this._path = path;
}

exports.Holder = Holder;


Holder.CVC = 1;		// Holder of CVC certificates
Holder.X509 = 2;	// Holder of X509 certificates
Holder.TYPEMASK = 0x0F;	// Mask to split certificate type from context



Holder.prototype.getReadablePath = function() {
	var path = this.dao.determineHolderPathList(this);
	var name = "";

	for (var j = 0; j < path.length; j++) {
		var holder = path[j];
		if (j > 0) {
			name += " / ";
		}
		name += holder.name;
	}

	return name;
}



Holder.prototype.toString = function() {
	var str = "Holder";
	str += "\nid '" + this.id + "'";
	if (this.certificateType == 2) {
		str += "\ncertificateType X509";
	} else {
		str += "\ncertificateType '" + this.certificateType + "'";
	}
	str += "\nparentId '" + this.parentId + "'";
	str += "\nname '" + this.name + "'";
	str += "\nsubjectId '" + this.subjectId + "'";
	str += "\nsignerNo '" + this.signerNo + "'";
	str += "\ncertId '" + this.certId + "'";

	return str;
}
