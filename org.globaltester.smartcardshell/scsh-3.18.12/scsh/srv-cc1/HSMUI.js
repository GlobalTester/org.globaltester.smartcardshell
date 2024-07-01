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
 * @fileoverview A simple HSM maintaince web GUI
 */

var CommonUI = require('scsh/srv-cc1/CommonUI').CommonUI;
var PKAWizard = require('scsh/srv-cc1/PKAWizard').PKAWizard;
var SmartCardHSM = require('scsh/sc-hsm/SmartCardHSM').SmartCardHSM;



/**
 * Create a HSM maintainance web GUI
 *
 * @class Class implementing a simple HSM maintainance user interface
 * @constructor
 * @param {SmartCardHSM} hsm the SmartCard-HSM to which the GUI is attached
 */
function HSMUI(service, session) {
	CommonUI.call(this, service, session);
	this.service = service;
	this.selectedHSM = service.getHSMStates()[0];
}

HSMUI.prototype = new CommonUI();
HSMUI.constructor = HSMUI;

exports.HSMUI = HSMUI;



/**
 * Prepare table with status information for HSM
 *
 * @param {HSMState} hsmstate the current state
 */
HSMUI.prototype.renderHSMInfo = function(hsmstate) {
	var t = <table class="content"/>;
	t.colgroup += <colgroup><col width="20%"/><col/></colgroup>
	t.tr += <tr><td>Id</td><td>{ hsmstate.path }</td></tr>;

	if (hsmstate.isOffline()) {
		if (hsmstate.error) {
			var str = "Offline (" + hsmstate.error + ")";
		} else {
			var str = "Offline";
		}
	} else {
		var str = "Online";
	}

	t.tr += <tr><td>Status</td><td>{ str }</td></tr>;

	if (hsmstate.readerName) {
		t.tr += <tr><td>Reader</td><td>{ hsmstate.readerName }</td></tr>;
	}

	if (!hsmstate.isOffline()) {
		if (hsmstate.pka) {
			t.tr += <tr><td>Authentication Status</td><td>{ hsmstate.pka.describeStatus() }</td></tr>;
		} else {
			t.tr += <tr><td>Authentication Status</td><td>{ SmartCardHSM.describePINStatus( hsmstate.pinsw, "User") }</td></tr>;
		}
	}

	return t;
}



/**
 * Serve the status page
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {String[]} url array of URL path elements
 */
HSMUI.prototype.serveStatusPage = function(req, res, url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var hsmlist = this.service.getHSMStates();

	if (hsmlist.length == 0) {
		var page = <div>
				<p>No SmartCard-HSM connected yet.</p>
				<p>Please configure service to use a SmartCard-HSM.</p>
				<p>You can also connect a device by running:</p>
				<pre>
					$ java -jar ocf-cc.jar http://localhost:8080/rt/hsm
				</pre>
				<p>Press the refresh button once the SmartCard-HSM is connected.</p>
			</div>

		this.sendPage(req, res, url, page);
		return;
	}

	if (!this.selectedHSM) {
		this.selectedHSM = hsmlist[0];
	}

	var page =
		<div>
			<h1>SmartCard-HSM</h1>
			<form action="" method="get">
				Select HSM
				<input name="op" type="hidden" value="changehsm"/>
				<select name="hsm" size="1" onchange="this.form.submit()">

				</select>
				<button type="submit">Refresh</button>
			</form>
			<br/>
			<div id="hsminfo" />
			<br/>
			<div id="actions" />
		</div>

	var l = page.form.select.(@name=="hsm");
	var hsmlist = this.service.getHSMStates();

	for each (var hsm in hsmlist) {
		if (this.selectedHSM.path == hsm.path) {
			l.option += <option selected="selected" value={ hsm.path }>{hsm.toString()}</option>
		} else {
			l.option += <option value={ hsm.path }>{hsm.toString()}</option>
		}
	}

	var div = page.div.(@id == "hsminfo");
	div.appendChild(this.renderHSMInfo(this.selectedHSM));

	if (!this.selectedHSM.isOffline()) {
		if (!this.selectedHSM.pka) {
			if (this.selectedHSM.hasProtectedPINEntry()) {
				var action = <div>
					<form action="" method="get">
						<input name="op" type="hidden" value="verifypin"/>
						<button type="submit">Verify PIN</button>
					</form>
				</div>
			} else {
				var action = <div>
					<form action="" method="get">
						<input name="op" type="hidden" value="verifypin"/>
						<input name="pin" type="password" size="20"/>
						<button type="submit">Verify PIN</button>
					</form>
				</div>
			}
		} else {
			var action = <div>
				<form action="" method="get">
					<input name="op" type="hidden" value="authenticate"/>
					<button type="submit">Authenticate</button>
				</form>
			</div>;
		}

		action.form += 	<form action="" method="get">
					<input name="op" type="hidden" value="logout"/>
					<button type="submit">Logout</button>
				</form>

		if (!this.selectedHSM.isLocal) {
			action.form += 	<form action="" method="get">
						<input name="op" type="hidden" value="disconnect"/>
						<button type="submit">Disconnect</button>
					</form>
		}

		var div = page.div.(@id == "actions");
		div.appendChild(action);
	}

	this.sendPage(req, res, url, page);
}



/**
 * Create wizard to handle public key authentication
 */
HSMUI.prototype.handlePKAAuthenticate = function(req, res, url) {
	this.wizard = new PKAWizard(this, this.selectedHSM);
	this.redirectTo(req, res, url, "/wizard");
}



/**
 * Handle card interaction by defereing to wizard
 */
HSMUI.prototype.handleCard = function(session, pathInfo) {
	if (this.wizard) {
		this.wizard.handleCard(session, pathInfo);
	}
}



/**
 * Dispatch all GET inquiries
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
HSMUI.prototype.handleRequest = function(req, res) {
	if (this.service.authenticationRequired) {
		if (typeof(this.session.user) == "undefined") {
			this.serveNotAuthorizedPage(req, res, req,url);
			return;
		}

		if (this.service.roleRequired > 0) {
			if ((typeof(this.session.user.roles) == "undefined") || (this.session.user.roles.indexOf(this.service.roleRequired) <= 0)) {
				this.serveNotAuthorizedPage(req, res, req,url);
				return;
			}
		}
	}

	// pathInfo always starts with an "/"
	var url = req.pathInfo.substr(1).split("/");

	// Handle details
	if (url.length > 1) {
		var detailsType = url[1];
//		GPSystem.trace("Handle details for :" + detailsType);
		switch(detailsType) {
		case "wizard":
			this.handleWizard(req, res, url);
			break;
		default:
			res.setStatus(HttpResponse.SC_NOT_FOUND);
		}
	} else {
		// Handle operations
		if (req.queryString) {
			// Handle operations
			var operation = CommonUI.parseQueryString(req.queryString);

			switch(operation.op) {
			case "changehsm":
				var newhsm = this.service.getHSMState(operation.hsm);
				if (newhsm) {
					this.selectedHSM = newhsm;
				}
				this.redirectTo(req, res, url, "");
				break;
			case "verifypin":
				var result = this.service.verifyUserPIN(this.selectedHSM, operation.pin);

				this.serveRefreshPage(req, res, url, result);
				break;
			case "authenticate":
				this.handlePKAAuthenticate(req, res, url);
				break;
			case "logout":
				this.selectedHSM.logout();
				this.redirectTo(req, res, url, "");
				break;
			case "disconnect":
				this.selectedHSM.disconnect();
				this.redirectTo(req, res, url, "");
				break;
			default:
				this.serveStatusPage(req, res, url);
			}
		} else {
			this.serveStatusPage(req, res, url);
		}
	}
}
