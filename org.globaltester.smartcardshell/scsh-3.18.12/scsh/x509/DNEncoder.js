/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2016 CardContact Software & System Consulting
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
 * @fileoverview Encoder for Distinguished Names using input data and a mask
 */

PKIXCommon			= require("scsh/x509/PKIXCommon").PKIXCommon;



/**
 * An instance of this class allow generating a Distinguished Name from components
 * defined in the mask given as constructor. The mask may contain placeholders in the
 * form ${major.minor} that are resolved against other DNs and objects set with setDN() or
 * setMap().
 *
 * @constructor
 * @param {String} mask the mask for generating the DN
 */
function DNEncoder(mask) {
	this.dnmask = PKIXCommon.parseDN(mask);
	this.dnmap = {};
	this.objmap = {};
}

exports.DNEncoder = DNEncoder;



/**
 * Register a DN under the given name. Elements in the DN can be referenced by ${major.minor}
 * with major set to the name given as argument and minor being the component in the given DN.
 *
 * @param {String} name the name for the major key
 * @param {String/Object} dn the Distinguished Name given as String or in the format returned by PKIXCommon.parseDN.
 */
DNEncoder.prototype.setDN = function(name, dn) {
	if (typeof(dn) == "string") {
		dn = PKIXCommon.parseDN(dn);
	}
	this.dnmap[name] = dn;
}



/**
 * Register an object and it properties the given name. Elements in the object can be referenced by ${major.minor}
 * with major set to the name given as argument and minor being the member of the given object.
 *
 * @param {String} name the name for the major key
 * @param {Object} map the map object
 */
DNEncoder.prototype.setMap = function(name, map) {
	this.objmap[name] = map;
}



/**
 * Replace key with value from DN
 * @private
 * @param {Object} o the DN object
 * @param {String} major the major key value
 * @param {String} minor the minor key value
 * @type String
 * @return the replacement value
 */
DNEncoder.prototype.replaceFromDN = function(o, major, minor) {
	var v = PKIXCommon.findRDN(o, minor.toUpperCase());
	if (!v) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "Element " + minor + " not found in " + major);
	}
	return v;
}



/**
 * Replace key with value from object
 * @private
 * @param {Object} o the object
 * @param {String} major the major key value
 * @param {String} minor the minor key value
 * @type String
 * @return the replacement value
 */
DNEncoder.prototype.replaceFromObject = function(o, major, minor) {
	if (typeof(o[minor]) == "undefined") {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "Element " + minor + " not found in " + major);
	}
	return o[minor];
}



/**
 * Replace key
 * @private
 * @param {String} key the in the format ${major.minor}
 * @type String
 * @return the replacement value
 */
DNEncoder.prototype.replace = function(key) {
	var r = /\$\{(\w+)\.(\w+)\}/.exec(key);
	if (r == null) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "The expression " + key + " is not valid");
	}

	var major = r[1];
	var minor = r[2];

	var o = this.dnmap[major];
	if (typeof(o) != "undefined") {
		return this.replaceFromDN(o, major, minor);
	} else {
		var o = this.objmap[major];

		if (typeof(o) != "undefined") {
			return this.replaceFromObject(o, major, minor);
		} else {
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "Unknown major key " + major);
		}
	}
}



/**
 * Check key for validity
 * @private
 * @param {String} key the in the format ${major.minor}
 */
DNEncoder.prototype.check = function(key) {
	var r = /\$\{(\w+)\.(\w+)\}/.exec(key);
	if (r == null) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "The expression " + key + " is not valid");
	}

	var major = r[1];
	var minor = r[2];

	var o = this.dnmap[major];
	if (typeof(o) != "undefined") {
		if (PKIXCommon.validRDN.indexOf(minor.toUpperCase()) == -1) {
			throw new GPError(module.id, GPError.INVALID_DATA, 0, minor + " is not a supported RDN (Valid RDNs are " + PKIXCommon.validRDN + ")");
		}
	} else {
		var o = this.objmap[major];

		if (typeof(o) != "undefined") {
			if ((typeof(o.any) == "undefined") && (typeof(o[minor]) == "undefined")) {
				throw new GPError(module.id, GPError.INVALID_DATA, 0, "Unknown minor key " + minor);
			}
		} else {
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "Unknown major key " + major);
		}
	}
	return "";
}



/**
 * Iterate replacement strings
 * @private
 *
 * @param {String} func the name of the replacement function
 */
DNEncoder.prototype.iterate = function(func) {
	var dn = [];

	for (var i = 0; i < this.dnmask.length; i++) {
		var rdn = this.dnmask[i];
		var nrdn = {};
		for (var k in rdn) {
			var inp = rdn[k];
//			print(k + "=" + inp);
			var fixed = inp.split(/\$\{.+?\}/);
//			print("Fixed[" + fixed.length + "]: " + fixed);
			var keys = inp.match(/\$\{.+?\}/g);
			if (keys == null) {
				keys = [];
			}
//			print("Keys[" + keys.length + "] : " + keys);

			var res = "";
			for (var c = 0; c < (fixed.length + keys.length); c++) {
				if ((c & 1) == 0) {
					res += fixed[c >> 1];
				} else {
					res += this[func](keys[c >> 1]);
				}
			}
			nrdn[k] = res;
		}
		dn.push(nrdn);
	}
	return dn;
}



/**
 * Encode DN based on mask and previously set objects
 *
 * @type Object
 * @return DN in the format as returned by PKIXCommon.parseDN()
 */
DNEncoder.prototype.encode = function() {
	return this.iterate("replace");
}



/**
 * Validate DN mask against previously set reference objects
 *
 * DN objects can be set with setDN(name, {}). The minor key is validated against the list of
 * valid RDN as defined in PKIXCommon.validRDN.
 *
 * Other objects can be set with setMap(), but only the key names in the map are relevant. If the
 * object contains the property "any", then any minor keys are acceptable.
 *
 * The method will throw an exception if a key is invalid.
 */
DNEncoder.prototype.validate = function() {
	return this.iterate("check");
}



DNEncoder.test = function() {
	var d = new DNEncoder("c=${issuer.c},o=${issuer.o},cn=ABC ${issuer.o}${servicerequest.commonName} DEF");

	d.setDN("issuer", "c=UT,o=ACME,cn=ACME Root CA");

	var sr = {
		commonName: "Hello"
	};

	d.setMap("servicerequest", sr);

	d.validate();
	print(PKIXCommon.dnToString(d.encode()));
}
