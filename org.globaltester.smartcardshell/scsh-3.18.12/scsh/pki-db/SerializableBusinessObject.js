/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2018 CardContact Software & System Consulting
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
 * @fileoverview Serializable Business Object
 */

function SerializableBusinessObject() {

}

exports.SerializableBusinessObject = SerializableBusinessObject;



SerializableBusinessObject.prototype.getContent = function() {
	if (this._content) {
		return this._content;
	}
	if (!this.content) {
		return {};
	}
	this._content = this.deserialize(this.content);
	return this._content;
}



SerializableBusinessObject.prototype.setContent = function(obj) {
	this._content = obj;
	this.content = this.serialize();
}



SerializableBusinessObject.prototype.serialize = function() {
	if (typeof(this._content) != "undefined") {
		this.content = JSON.stringify(this._content, null, '\t');
	}
	return this.content;
}



/**
 * Recreate embedded objects
 *
 * @private
 */
SerializableBusinessObject.JSONReviver = function(key, value) {
	if (value && value.clazz) {
		switch(value.clazz) {
			case "ByteString": value = ByteString.fromJSON(value); break;
		}
	}
	return value;
}



SerializableBusinessObject.prototype.deserialize = function(json) {
	return JSON.parse(json, SerializableBusinessObject.JSONReviver);
}
