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
 * @fileoverview HolderDAO
 */

Holder = require('scsh/pki-db/Holder').Holder;
Certificate = require('scsh/pki-db/Certificate').Certificate;



/**
 * Data access object for certificate holders
 *
 * @param {Object} the factory that created this DAO
 */
function HolderDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.HolderDAO = HolderDAO;



HolderDAO.prototype.toString = function() {
	return "HolderDAO(fs)";
}



/**
 * Create and persists a new holder object
 *
 * @param {String} path the path in the PKI hierachie
 * @param {Number} certtype one of Holder.CVC or Holder.X509. See Holder for explanation
 * @type Holder
 * @return the newly created holder object
 */
HolderDAO.prototype.newHolder = function(path, certtype) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newHolder(" + path + "," + certtype + ")");

	assert(path, "Parameter path must not be empty");
	assert(typeof(path) == "string", "Parameter path must be a String");

	if (!certtype) {
		certtype = Holder.CVC;
	}

	assert(((certtype & 0xF) == Holder.CVC) || ((certtype & 0xF) == Holder.X509), "Parameter certtype invalid");

	var h = new Holder(this, path, certtype);
	this.updateConfig(h, "certificateType", certtype);
	return h;
}



/**
 * @private
 */
HolderDAO.prototype.updateConfig = function(holder, key, val) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateConfig(" + holder + "," + key + "," + val + ")");

	default xml namespace = "";
	var cfg = this.factory.loadConfig(holder._path);
	if (cfg == null) {
		GPSystem.log(GPSystem.DEBUG, module.id, "defaultConfig");
		cfg = this.factory.getDefaultConfig();
	}

	if (key) {
		cfg.sequence[key] = val;
	}

	this.factory.saveConfig(holder._path, cfg);
}



/**
 * Get holder for given PKI path
 *
 * @param {String} path the path in the PKI hierachie
 * @type Holder
 * @return the holder at the path
 */
HolderDAO.prototype.getHolder = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getHolder(" + path + ")");

	assert(path, "Parameter path must not be empty");
	assert(typeof(path) == "string", "Parameter path must be a String");

	default xml namespace = "";
	var cfg = this.factory.loadConfig(path);

	if (!cfg) {
		GPSystem.log(GPSystem.DEBUG, module.id, "Holder not found");
		return null;
	}

	if (cfg.sequence.certificateType.toString().length > 0) {
		var certtype = parseInt(cfg.sequence.certificateType);
		GPSystem.log(GPSystem.DEBUG, module.id, "certtype=" + certtype);
	} else {
		certtype = Holder.CVC;
	}

	var signerNo = parseInt(cfg.sequence.current);
	GPSystem.log(GPSystem.DEBUG, module.id, "signerNo=" + signerNo);

	var h = new Holder(this, path);
	h.signerNo = signerNo;
	h.certificateType = certtype;
	return h;
}



/**
 * Get a list of holders under the PKI path.
 *
 * @param {String} path the path in the PKI hierachie, use "/" to obtain root holders.
 * @type String[]
 * @return the list of holder names at the path
 */
HolderDAO.prototype.getHolderList = function(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getHolderList(" + path + ")");

	assert(typeof(path) == "string", "Parameter path must be a String");

	var list = this.factory.enumerateFiles(path);
	return list;
}



/**
 * Update the signer number
 *
 * @param {Holder} holder the holder
 * @param {Number} val the new signer number
 */
HolderDAO.prototype.updateSignerNo = function(holder, val) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateSignerNo(" + holder + "," + val + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(typeof(val) == "number", "Parameter val must be a Number");

	this.updateConfig(holder, "current", val);
	holder.signerNo = val;
}



/**
 * Update the current certificate
 *
 * @param {Holder} holder the holder
 * @param {Number} val the new signer number
 */
HolderDAO.prototype.updateCurrentCertificate = function(holder, certificate) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateSignerNo(" + holder + "," + certificate + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(certificate, "Parameter certificate must not be empty");
	assert(certificate instanceof Certificate, "Parameter must be instance of Certificate");

	this.updateConfig(holder, "currentCHR", certificate.serial);
	holder.currentCertificate = certificate;
}
