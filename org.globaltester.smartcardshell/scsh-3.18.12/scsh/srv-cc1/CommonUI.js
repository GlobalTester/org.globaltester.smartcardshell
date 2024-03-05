/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2010 CardContact Software & System Consulting
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
 * @fileoverview Common UI elements
 */

var AuthenticationWizard	= require('scsh/srv-cc1/AuthenticationWizard').AuthenticationWizard;
var CardAction			= require('scsh/srv-cc1/CardAction').CardAction;


/**
 * Create a Common UI web GUI
 *
 * @class Class implementing a common UI operations
 * @constructor
 * @param {CVCAService} service the service to which the GUI is attached
 */
function CommonUI(service, session) {
	if (service) {
		this.service = service;
		this.session = session;
		this.bookmarks = [];
		this.resultCode = null;
		this.resultMessage = null;
		this.resultClass = null;
	}
}

exports.CommonUI = CommonUI;



/**
 * Create a date string for a given date object in the format YYYY-MM-DD
 *
 * @param {Date} date the date object
 * @type String
 * @return the date string
 */
CommonUI.dateString = function(date) {
	return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
}



/**
 * Parse operations string into object containing parameter and values
 *
 * <p>An operations string may contain multiple entries separated by an ampersand.</p>
 * <p>Entries may have a value assigned using the parameter=value notation.</p>
 * <p>Valid operations strings are "link", "link=all", "filer=true&start=0"</p>
 *
 * @param {String} op the operations string
 * @returns an object with properties matching entries.
 * @type Object
 */
CommonUI.parseQueryString = function(op) {
	var result = {};

	if (!op) {
		return result;
	}

	var elems = op.split("&");
	for (var i = 0; i < elems.length; i++) {
		var s = elems[i];
		var ofs = s.indexOf("=");
		if (ofs >= 0) {
			var p = s.substring(ofs + 1);
			s = s.substring(0, ofs);
			result[s] = decodeURIComponent(p);
		} else {
			result[s] = true;
		}
	}
	return result;
}



/**
 * Return a string that directs to the URL of the UI
 *
 * @param {String[]} url the array of URL elements
 * @type String
 * @return the URL to direct to the home URL
 */
CommonUI.prototype.homeURL = function(url) {
	var prefix = "";
	for (var i = 1; i < url.length; i++) {
		prefix += "../";
	}
	return prefix + url[0];
}



/**
 * Add SC_SEE_OTHER HTTP Codew with location to direct to newurl
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {String[]} url the array of URL elements
 */
CommonUI.prototype.redirectTo = function(req, res, url, newurl) {
	res.setStatus(HttpResponse.SC_SEE_OTHER);
	res.addHeader("Location", this.homeURL(url) + newurl);
}



/**
 * Generate a HTML template
 *
 * @param {String[]} url the array of URL elements
 * @returns the HTML page template
 * @type XML
 */
CommonUI.prototype.generateTemplate = function(url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var prefix = "";
	for (var i = 1; i < url.length; i++) {
		prefix += "../";
	}

	var pagetemplate =
		<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en" >
			<head>
				<title>{this.service.type + " " + this.service.name}</title>
				<link rel="stylesheet" type="text/css" href={prefix + "../css/style.css"}/>
			</head>
			<body>
				<div align="left">
					<a href="http://www.cardcontact.de"><img src={prefix + "../images/banner.jpg"} width="750" height="80" border="0"/></a>
				</div>
				<div id="navigator">
					<p><b> {this.service.type}</b></p>
				</div>
				<div id="main">
					<div id="user"/>
					<div id="error"/>
					<div id="content"/>
					<p class="copyright">(c) Copyright 2003 - 2017 <a href="http://www.cardcontact.de">CardContact</a> Systems GmbH, Minden, Germany</p>
				</div>
			</body>
		</html>

	if (this.session.user) {
		var content =
			<div align="right">
				<p>
					{this.session.user.name} <a href={prefix + url[0] + "/logout"}>Logout</a>
				</p>
			</div>
		var div = pagetemplate.body..div.(@id == "user");
		div.appendChild(content);
	}

	if (this.resultCode != null) {
		var page =
			<div>
				<p id="result" class= { this.resultClass }>{ this.resultMessage } (<b id="resultCode">{ this.resultCode }</b>)</p>
			</div>

		var div = pagetemplate.body..div.(@id == "error");
		div.appendChild(page);
	}

	return pagetemplate;
}



/**
 * Send page after embedding in the HTML template
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {String[]} url the array of URL elements
 * @param {XML} page the page contents
 */
CommonUI.prototype.sendPage = function(req, res, url, page) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	if (typeof(page) == "undefined") {
		url = req.url;
		page = url;
	}

	var t = this.generateTemplate(url);
	var c = t..div.(@id == "content");
	c.div = page;

	var bml = <ul/>;
	var bookmarks = ApplicationServer.instance.getUIList();
	bookmarks = bookmarks.concat(this.bookmarks);

	for (var i = 0; i < bookmarks.length; i++) {
		var bm = bookmarks[i];

		if (bm.id == url[0]) {
			bml.appendChild(<li><a class="bookmarkactive" href={bm.url} title={bm.description}>{bm.name}</a></li>);
		} else {
			bml.appendChild(<li><a href={bm.url} title={bm.description}>{bm.name}</a></li>);
		}
	}
	var c = t..div.(@id == "navigator");
	c.appendChild(bml);
	c.appendChild(<p style="font-size: 7pt">{ VERSION }</p>);

	this.clearResultMessage();

	res.setContentType("application/xhtml+xml");
	res.print('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
	res.print('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n');
	res.print(t.toXMLString());
}



CommonUI.prototype.serveNotAuthorizedPage = function(req, res, url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page = <p>You are not authorized to access this service or function.</p>
	this.sendPage(req, res, url, page);
}



CommonUI.prototype.serveWizardActivePage = function(req, res, url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page = <p>A wizard is active for this session. Please switch to service with running wizard.</p>
	this.sendPage(req, res, url, page);
}



/**
 * Add a bookmark shown on the navigation panel
 *
 * @param {String} name the name to display
 * @param {String} url the URL for this bookmark
 */
CommonUI.prototype.addBookmark = function(name, url) {
	var m = { name: name, url: url };
	this.bookmarks.push(m);
}



/**
 * Serves a refresh page that redirects back to the given URL
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {String} refreshUrl the redirect URL
 * @param {String} statusMessage the status message or undefined
 */
CommonUI.prototype.serveRefreshPage = function(req, res, url, statusMessage) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var prefix = "";
	for (var i = 1; i < url.length; i++) {
		prefix += "../";
	}

	var page = this.generateTemplate(url);

	if ((typeof(statusMessage) == "undefined") || (statusMessage == null)) {
		statusMessage = "Operation completed";
	}

	page.head.meta = <meta http-equiv="Refresh" content={"1; url=" + prefix + url[0]}/>;

	var c = page..div.(@id == "content");

	c.p = <p>{statusMessage}</p>

	res.setContentType("text/html");
	res.print('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n');
	res.print(page.toXMLString());
}



/**
 * Add an action entry to the list of possible actions
 *
 * @param {XML} ul the list of action elements
 * @param {String} cmd the command part of the URL
 * @param {Number} index the index into the service request list
 * @param {String} action the action to be performed
 */
CommonUI.addAction = function(ul, cmd, index, action) {
	default xml namespace = "http://www.w3.org/1999/xhtml";
	ul.li += <li><a href={cmd + "?index=" + index + "&action=" + action}>Respond</a>{" with " + action}</li>
}



/**
 * Set the error message
 *
 * @param {String} message the error message
 */
CommonUI.prototype.setErrorMessage = function(code, message) {
	if (!message) {
		message = "Operation failed";
	}
	this.resultCode = code;
	this.resultMessage = message;
	this.resultClass = "error";
}



/**
 * Set the completion message
 *
 * @param {String} message the error message
 */
CommonUI.prototype.setCompletionMessage = function(code, message) {
	if (!message) {
		message = "Operation completed";
	}
	this.resultCode = code;
	this.resultMessage = message;
	this.resultClass = "ok";
}



/**
 * Clear the error log
 */
CommonUI.prototype.clearResultMessage = function() {
	this.resultCode = null;
}



/**
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {String[]} url array of URL path elements
 */
CommonUI.prototype.handleWizard = function(req, res, url) {
	GPSystem.log(GPSystem.DEBUG, module.id, "handleWizard(" + url + ")");

	if (!this.wizard) {
		var page = <div>
				<p>No wizard active or cookies disabled in browser.
				   You see this message, because the application redirected your browser
				   to the wizard URL, but the server was unable to related a running
				   wizard to your browser session. The most likely reason is that
				   you disabled cookies in the browser or entered the wizard URL without
				   first starting a wizard.</p>
			</div>
		this.sendPage(req, res, url, page);
		return;
	}

	if (typeof(this.wizard.handleRequest) == "function") {
		this.wizard.handleRequest(req, res);
	} else {
		page = this.wizard.getPage(req, res, url);

		if (page) {
			this.sendPage(req, res, url, page);
		} else {
			if (req.queryString || req.method == "POST") {			// Form processing redirect
				this.redirectTo(req, res, url, "/wizard");
			} else {
				if (this.resultCode) {
					this.redirectTo(req, res, url, "");
				} else {
					this.serveRefreshPage(req, res, url, this.wizard.getReturnCode());
				}
			}
		}
	}
}



/**
 * Determine if the user is authorized
 */
CommonUI.prototype.isAuthorized = function() {
	var am = this.service.authorizationManager;

	if (typeof(am) == "undefined") {
		return true;
	}

	if (!this.isAuthenticated()) {
		return false;
	}

	return am.loginAllowed(this.session.user);
}



/**
 * Determine if the user is authenticated
 */
CommonUI.prototype.isAuthenticated = function() {
	return typeof(this.session.cardState) != "undefined";
}



/**
 * Logout the current user
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {String[]} url array of URL path elements
 */
CommonUI.prototype.handleLogout = function(req, res, url) {
	delete this.session.wizard;
	delete this.wizard;
	ApplicationServer.instance.logout(req, res);
}



/**
 * Handle card requests with a registered wizard
 */
CommonUI.prototype.handleCard = function(session, pathInfo) {
	if (!this.wizard || !this.wizard.handleCard) {
		GPSystem.log(GPSystem.DEBUG, module.id, "handleCard() called but no processing wizard available");
	} else {
		this.wizard.handleCard(session, pathInfo);
	}
}



/**
 * Translate SmartCard-HSM induced exception into UI information
 */
CommonUI.prototype.handleSmartCardHSMError = function(e, fallthrough) {
	switch(e.error) {
		case GPError.USER_ABORT:
			this.setErrorMessage("abort", e.message);
			break;
		case GPError.DEVICE_ERROR:
			this.setErrorMessage("failure_keystore", e.message);
			break;
		case GPError.AUTHENTICATION_METHOD_BLOCKED:
			this.setErrorMessage("failure_keystore_authentication_locked", "SmartCard-HSM user authentication is locked due to excessive tries");
			break;
		case GPError.CARD_REMOVED:
			this.setErrorMessage("failure_no_keystore", "Card was removed");
			break;
		case GPError.CARD_CONNECT_FAILED:
			this.setErrorMessage("failure_no_keystore", "SmartCard-HSM not found. Insert token or card");
			break;
		case GPError.CARD_COMM_ERROR:
			this.setErrorMessage("failure_keystore", "Communication with the SmartCard-HSM failed");
			break;
		case GPError.NOT_AUTHENTICATED:
		case GPError.AUTHENTICATION_FAILED:
			this.setErrorMessage("failure_keystore_locked", "User authentication at SmartCard-HSM failed");
			break;
		case GPError.OUT_OF_MEMORY:
			this.setErrorMessage("failure_keystore_out_of_memory", "SmartCard-HSM is out of memory");
			break;
		default:
			if (fallthrough) {
				return false;
			}
			this.setErrorMessage("failure", "SmartCard-HSM failure: " + e.message);
			break;
	}
	return true;
}
