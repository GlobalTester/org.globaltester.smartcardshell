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
 * @fileoverview The wizard retrieves the information from the HSM which is necessary for authorization and queries the Authorization Manager
 */

var CardAction		= require('scsh/srv-cc1/CardAction').CardAction;
var SmartCardHSM	= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSM;

/**
 * Create a new AuthenticationWizard
 *
 * The AuthenticationWizard uses the remote terminal to authenticate a SmartCard-HSM using the
 * device authentication certificate chain.
 *
 * The wizard injects a cardState object into the session object, containing the properties chain
 * (from SmartCardHSM.validateCertificateChain()) and pinState (the SW1/SW2 returned by VERIFY).
 *
 * If the an authorizationManager is defined, then the getUser() method is called with
 * the SmartCard-HSM unique id passed as parameter. The user is injected as property user into the
 * session object.
 *
 * If the returned user object has the pinRequired property set, then the wizard enforces that the PIN was validated.
 * The same is true if requestpin is set in the constructor
 *
 * @param {CommonUI} ui the service ui (can be null)
 * @param {AuthorizationManager} authorizationManager a class implementing a getUser() method that maps a unique id to a user object
 * @param {Boolean} requestpin request client to try PIN verification
 */
function AuthenticationWizard(ui, authorizationManager, requestpin, style) {
	CardAction.call(this, ui);
	this.authorizationManager = authorizationManager;
	this.requestpin = requestpin;
	this.style = AuthenticationWizard.STYLE_DEFAULT;
	if (style) {
		this.style = style;
	}
}

AuthenticationWizard.prototype = Object.create(CardAction.prototype);
AuthenticationWizard.constructor = AuthenticationWizard;

exports.AuthenticationWizard = AuthenticationWizard;



AuthenticationWizard.STYLE_DEFAULT = 0;
AuthenticationWizard.STYLE_PAAS = 1;



/**
 * Generate the default HTML template
 *
 * @returns the HTML page template
 * @type XML
 */
AuthenticationWizard.prototype.generateDefaultTemplate = function() {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var template =
		<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en" >
			<head>
				<title>Login Required</title>
				<link rel="stylesheet" type="text/css" href={"css/style.css"}/>
			</head>
			<body>
				<div align="left">
					<a href="http://www.cardcontact.de"><img src={"images/banner.jpg"} width="750" height="80" border="0"/></a>
				</div>

				<div id="main">
					<div id="error"/>
					<div id="content"/>
					<p class="copyright">{String.fromCharCode(0xA9) + " Copyright 2003 - 2017 "}<a href="http://www.cardcontact.de">CardContact</a> Systems GmbH, Minden, Germany</p>
				</div>
			</body>
		</html>;

	return template;
}



/**
 * Generate the PKI-as-a-Service HTML template
 *
 * @returns the HTML page template
 * @type XML
 */
AuthenticationWizard.prototype.generatePaaSTemplate = function() {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var template =
		<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en" >
			<head>
				<title>Login Required</title>
				<link rel="stylesheet" type="text/css" href="css/paas_style.css"/>
				<link rel="stylesheet" type="text/css" href="css/pure-min.css"/>
				<link rel="stylesheet" type="text/css" href="css/grids-responsive-min.css"/>
			</head>
			<body>
				<div class="banner" align="left">
					<a href="http://www.cardcontact.de"><img src="images/CardContact_logo_b28.jpg"  border="0"/></a>
				</div>
				<div class="paas-navigator-empty "/>

				<div id="main">
					<div id="error"/>
					<div id="content"/>
					<p class="copyright">{String.fromCharCode(0xA9) + " Copyright 2003 - 2023 "}<a href="http://www.cardcontact.de">CardContact</a> Systems GmbH, Minden, Germany</p>
				</div>
			</body>
		</html>;

	return template;
}



/**
 * Send page after embedding in the HTML template
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 * @param {XML} page the page contents
 */
AuthenticationWizard.prototype.sendPage = function(req, res, page) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var template = null;
	switch (this.style) {
		case AuthenticationWizard.STYLE_PAAS:
			template = this.generatePaaSTemplate();
			page.@class = "welcomepage";
			break;
		default:
			template = this.generateDefaultTemplate();
	}

	var c = template..div.(@id == "content");
	c.div = page;

	res.setContentType("application/xhtml+xml");
	res.addHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
	res.addHeader("Pragma", "no-cache");
	res.print('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
	res.print('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n');
	res.print(template.toXMLString());
}



AuthenticationWizard.REDIRECT = "redirect";
AuthenticationWizard.INVALIDCARD = "invalidcard";
AuthenticationWizard.NOTAUTHORIZED = "notauthorized";
AuthenticationWizard.WRONGPIN = "wrongpin";
AuthenticationWizard.BLOCKEDPIN = "blockedpin";
AuthenticationWizard.PINREQUIRED = "pinrequired";

/**
 * Return the page depending from the current state.
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
AuthenticationWizard.prototype.getPage = function(req, res) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getPage() : CardAction state: " + this.state);

	switch(this.state) {
		case CardAction.NEW:
			var acceptLang = req.getHeaderField("Accept-Language");
			GPSystem.log(GPSystem.DEBUG, module.id, "Accept-Language: " + acceptLang);
			var local = req.nativeRequest.getLocale();
			this.lang = local.getLanguage();
			GPSystem.log(GPSystem.DEBUG, module.id, "Local Language: " + this.lang);

			this.state = AuthenticationWizard.REDIRECT;
			var page = this.getLoginPage(req, res);
			break;
		case AuthenticationWizard.REDIRECT:
			var page = this.getRedirectionPage(req, res);
			this.state = CardAction.NOCLIENT;
			break;
		case CardAction.NOCLIENT:
			var page = this.getNoClientPage(req, res);
			this.state = AuthenticationWizard.REDIRECT;
			break;
		case AuthenticationWizard.INVALIDCARD:
			var page = this.getInvalidCardPage(req, res);
			this.state = CardAction.NEW;
			break;
		case AuthenticationWizard.NOTAUTHORIZED:
			var page = this.getNotAuthorizedPage(req, res);
			this.state = CardAction.NEW;
			break;
		case AuthenticationWizard.WRONGPIN:
			var page = this.getWrongPINPage(req, res);
			this.state = AuthenticationWizard.REDIRECT;
			break;
		case AuthenticationWizard.PINREQUIRED:
			var page = this.getPINRequiredPage(req, res);
			this.state = AuthenticationWizard.REDIRECT;
			break;
		case AuthenticationWizard.BLOCKEDPIN:
			var page = this.getBlockedPINPage(req, res);
			this.state = CardAction.NEW;
			break;
		case CardAction.SUCCESS:
			var page = null;
			break;
	}
	return page;
}



/**
 * Serve this page to start the redirection to the local client
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
AuthenticationWizard.prototype.getRedirectionPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	if (this.requestpin) {
		var page =
		<div>
			<h1>User Authentication</h1>
			<p>Please enter your PIN in the PIN dialog.</p>
			<p>The dialog may be covered by your browser window or will prompt on your PIN-Pad reader.</p>

			<p>Please wait for the green tick to appear. {this.getActivationLink(req, res, 1)}</p>
			<p>The page will be reloaded automatically if JavaScript is enabled.</p>
			<p>If JavaScript is disabled, then press <a href="">continue</a> after the green tick is shown.</p>
		</div>
	} else {
		var page =
		<div>
			<h1>Card Authentication</h1>
			<p>Please wait for the green tick to appear. {this.getActivationLink(req, res, -1)}</p>
			<p>The page will be reloaded automatically if JavaScript is enabled.</p>
			<p>If JavaScript is disabled, then press <a href="">continue</a> after the green tick is shown.</p>
		</div>
	}
	return page;
}



/**
 * Serve this page to start the redirection to the local client
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
AuthenticationWizard.prototype.getLoginPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>Login Required</h1>
			<p>Please insert your SmartCard-HSM and press <a href="">continue</a> or reload.</p>
		</div>

	return page;
}



/**
 * Serve this page if the client is not authorized for the service
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
AuthenticationWizard.prototype.getNotAuthorizedPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>Authorization Failed</h1>
			<p>You ({this.userId}) are not authorized to use this service.</p>
			<p>Press <a href="">continue</a></p>
		</div>

	return page;
}



/**
 * Serve this page if the client is required to perform PIN verification, but didn't
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
AuthenticationWizard.prototype.getPINRequiredPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>PIN Verification Required</h1>
			<p>PIN verification is required to access this service.</p>
			<p>Press <a href="">continue</a></p>
		</div>

	return page;
}



/**
 * Serve this page if the card at the client is no SmartCard-HSM
 *
 * @param {HttpRequest} req the request object
 * @param {HttpResponse} req the response object
 */
AuthenticationWizard.prototype.getInvalidCardPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>Authentication Failed</h1>
			<p>The card in your reader or the attached USB-Token is not a valid SmartCard-HSM.</p>
			<p>Press <a href="">continue</a></p>
		</div>

	return page;
}



AuthenticationWizard.prototype.getWrongPINPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>Wrong PIN</h1>
			<p>The PIN you entered was invalid or the PIN entry was cancelled.</p>
			<p>SmartCard-HSM {  SmartCardHSM.describePINStatus(this.cardState.pinState, "User-PIN") }.</p>
			<p><a href="">continue</a></p>
		</div>

	return page;
}



AuthenticationWizard.prototype.getBlockedPINPage = function(req, res) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>PIN not usable</h1>
			<p>SmartCard-HSM {  SmartCardHSM.describePINStatus(this.cardState.pinState, "User-PIN") }.</p>
			<p><a href="">continue</a></p>
		</div>

	return page;
}



/**
 * Handle authentication and query the Authorization Manager whether this HSM is authorized
 */
AuthenticationWizard.prototype.handleCardAction = function(card, session, pathInfo) {
	var crypto = new Crypto();
	try	{
		var sc = new SmartCardHSM(card);

		var devAutCert = sc.readBinary(SmartCardHSM.C_DevAut);
		var chain = SmartCardHSM.validateCertificateChain(crypto, devAutCert);
		if (chain == null) {
			this.state = AuthenticationWizard.INVALIDCARD;
			return;
		}

		sc.openSecureChannel(crypto, chain.publicKey);

		var sw = sc.queryUserPINStatus();
		this.cardState = {
			chain: chain,
			pinState: sw
		}
		if (sw == 0x6983) {
			this.cardState.resetRetryCounterEnabled = sc.isResetRetryCounterEnabled();
			this.cardState.PINResetEnabled = sc.isPINResetEnabled();
		}
		this.userId = chain.path;

		GPSystem.log(GPSystem.DEBUG, module.id, "Authenticated " + this.userId);
	}
	catch(e) {
		GPSystem.log(GPSystem.ERROR, module.id, __exception__);
		this.reportError(e);
		this.state = AuthenticationWizard.INVALIDCARD;
		return;
	}

	if (this.authorizationManager) {
		var user = this.authorizationManager.getUser(this.userId);

		if (!user) {
			this.state = AuthenticationWizard.NOTAUTHORIZED;
			return;
		}

		GPSystem.log(GPSystem.DEBUG, module.id, "AuthenticationWizard found user " + user.name);
		user.lang = this.lang.toUpperCase();
		GPSystem.log(GPSystem.DEBUG, module.id, "Setting language to " + user.lang);

		session.user = user;

		// Check if PIN is mandatory for this user
		if (user.pinRequired && (this.cardState.pinState != 0x9000)) {
			GPSystem.log(GPSystem.DEBUG, module.id, "PIN requested, but state is " + this.cardState.pinState.toString(HEX));

			if ((this.cardState.pinState & 0xFFF0) == 0x63C0) {
				this.state = AuthenticationWizard.WRONGPIN;
			} else {
				this.state = AuthenticationWizard.BLOCKEDPIN;
				GPSystem.log(GPSystem.DEBUG, module.id, "resetRetryCounterEnabled: " + this.cardState.resetRetryCounterEnabled);
				if (this.cardState.resetRetryCounterEnabled && typeof(this.authorizationManager.processBlockedToken) == "function") {
					this.authorizationManager.processBlockedToken(user, this.cardState.PINResetEnabled);
				}
			}
			return;
		}
	}
	session.cardState = this.cardState;
	this.state = CardAction.SUCCESS;
}
