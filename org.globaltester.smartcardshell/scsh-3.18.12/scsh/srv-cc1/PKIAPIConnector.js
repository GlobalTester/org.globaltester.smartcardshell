/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2023 CardContact Software & System Consulting
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
 * @fileoverview Connector for the PKI-API
 */


function PKIAPIConnector(cfg) {
	this.cfg = cfg;
}
PKIAPIConnector.constructor = PKIAPIConnector;

exports.PKIAPIConnector = PKIAPIConnector;



PKIAPIConnector.prototype.getConnection = function(url) {
	var c = new URLConnection(url);

	if (typeof(this.cfg.keyStore) != "undefined") {
		GPSystem.log(GPSystem.DEBUG, module.id, "Set trust store, key store and pw for PKI API connection");
		c.setTLSKeyStores(this.cfg.trustStore, this.cfg.keyStore, this.cfg.keyPassword);
	} else if (typeof(this.cfg.trustStore) != "undefined") {
		GPSystem.log(GPSystem.DEBUG, module.id, "Set only trust store for PKI API connection");
		c.setTLSKeyStores(this.cfg.trustStore);
	} else {
		GPSystem.log(GPSystem.DEBUG, module.id, "Didn't set tls key stores");
	}
	return c;
}



PKIAPIConnector.prototype.handleCookies = function(cookies) {
	var combinedCookie = "";
	for (var i = 0; i < cookies.length; i++) {
		var eol = cookies[i].indexOf(";");
		if (eol < 0) {
			eol = cookies[i].length;
		}
		var elem = cookies[i].substr(0, eol);
		if (i > 0) {
			combinedCookie += "; ";
		}
		combinedCookie += elem;
	}

	this.session = combinedCookie;
}



/**
 * Post an action to the PKI-API
 *
 * @param {Number} srID the Service Request ID
 * @param {Object} action the json action
 */
PKIAPIConnector.prototype.postAction = function(srID, action) {
	GPSystem.log(GPSystem.DEBUG, module.id, "postAction()");

	var url = this.cfg.apiURL + "/api/sr/" + srID + "/action";

	var c = this.getConnection(url);

	c.addHeaderField("Content-Type", "application/json");
	c.addHeaderField("Accept", "application/json");

	var json = JSON.stringify(action);
	GPSystem.log(GPSystem.DEBUG, module.id, "post action \n" + json + "\nto " + url);
	var rsp = c.post(json);
	GPSystem.log(GPSystem.DEBUG, module.id, "Response from PKI-API: " + rsp);
	var json = JSON.parse(rsp);

	var cookie = c.getHeaderField("Set-Cookie");

	if (cookie) {
		this.handleCookies(cookie);

		var sessionId = this.session.substring("JSESSIONID=".length);
		GPSystem.log(GPSystem.DEBUG, module.id, "PKI-API session id: " + sessionId);
		json.sessionId = sessionId;
	}

	return json;
}



/**
 * Query status of a card action
 *
 * @param {Number} srID the Service Request ID
 */
PKIAPIConnector.prototype.getCardActionStatus = function(srID) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCardActionStatus()");

	var url = this.cfg.apiURL + "/api/sr/" + srID + "/action";

	var c = this.getConnection(url);

	c.addHeaderField("Cookie", this.session);
	c.addHeaderField("Accept", "application/json");

	var rsp = c.get();
	GPSystem.log(GPSystem.DEBUG, module.id, "Response from PKI-API: " + rsp);

	var json = JSON.parse(rsp);
	return json;
}
