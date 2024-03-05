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
 * @fileoverview Wizard for public key authentication
 */

var CVC			= require('scsh/eac/CVC').CVC;
var SmartCardHSM	= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSM;
var ManagePKA		= require('scsh/sc-hsm/ManagePKA').ManagePKA;
var HSMKeyStore		= require('scsh/sc-hsm/HSMKeyStore').HSMKeyStore;

var CardAction		= require('scsh/srv-cc1/CardAction').CardAction;



/**
 * Wizard to perform a public key authentication with a SmartCard-HSM
 *
 */
function PKAWizard(ui, hsmstate) {
	CardAction.call(this, ui);
	this.hsmstate = hsmstate;
}

PKAWizard.prototype = new CardAction();
PKAWizard.constructor = PKAWizard;

exports.PKAWizard = PKAWizard;



PKAWizard.prototype.getPage = function(req, res, url) {
	GPSystem.trace("PKAWizard state: " + this.state);
	switch(this.state) {
		case "new":
			var page = this.getSignStartPage(req, res, url);
			this.state = "enumeratekeys";
			break;
		case "enumeratekeys":
			var page = this.getNoClientPage(req, res, url);
			this.state = "new";
			break;
		case "enterdata":
			if (req.method == "POST") {
				var page = this.processSignControlForm(req, res, url);
				this.state = "startsign";
			} else {
				var page = this.getSignControlForm(req, res, url);
			}
			break;
		case "startsign":
			var page = this.getSignProgressPage(req, res, url);
			this.state = "sign";
			break;
		case "sign":
			var page = this.getErrorPage(req, res, url);
			this.state = "startsign";
			break;
		default:
			var page = CardAction.prototype.getPage.call(this, req, res, url);
	}
	return page;
}



PKAWizard.prototype.getSignStartPage = function(req, res, url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>PKA Service</h1>
			<p>Enumerate keys... { this.getActivationLink(req, res, -1) }</p>
			<p>Please wait for the green tick to appear. The page will be reloaded automatically if JavaScript is enabled.</p>
			<p>If JavaScript is disabled, then press <a href="">continue</a> after the green tick is shown.</p>
		</div>
	this.signedMessage = "";
	return page;
}



PKAWizard.prototype.getSignNoKeyPage = function(req, res, url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>PKA Service</h1>
			<p>Error: The SmartCard-HSM has no available signing key.</p>
		</div>
	return page;
}



PKAWizard.prototype.getSignControlForm = function(req, res, url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<div id="error"/>
			<h1>PKA Service</h1>

			<form action="" method="post" enctype="multipart/form-data">
				<p>Select the key for authentication:</p>
				<select name="key"/>
				<button type="submit">Authenticate</button>
			</form>
		</div>

	this.signedMessage = "";

	var l = page.form.select;
	for each (var alias in this.keys) {
		l[0].appendChild(<option>{alias}</option>);
	}

	return page;
}



PKAWizard.prototype.processSignControlForm = function(req, res, url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	this.key = req.parameters.key;

	return null;
}



PKAWizard.prototype.getSignProgressPage = function(req, res, url) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var page =
		<div>
			<h1>PKA Service</h1>
			<p>Start authentication... { this.getActivationLink(req, res, 1) }</p>
			<p>This operation requires PIN verification. Please watch the PIN dialog in the upper right corner
			   of your screen or on your card readers PIN pad.</p>
			<p>Please wait for the green tick to appear. The page will be reloaded automatically if JavaScript is enabled.</p>
			<p>If JavaScript is disabled, then press <a href="">continue</a> after the green tick is shown.</p>
		</div>

	return page;
}



PKAWizard.prototype.handleCardAction = function(card, reqInfo) {
	var sc = new SmartCardHSM(card);

	var devAutCert = sc.readBinary(SmartCardHSM.C_DevAut);
	var crypto = new Crypto();
	var chain = SmartCardHSM.validateCertificateChain(crypto, devAutCert);
	if (chain == null) {
		this.lastMessage = "Could not authenticate SmartCard-HSM";
		return;
	}

	sc.openSecureChannel(crypto, chain.publicKey);

	switch(this.state) {
		case "enumeratekeys":
			this.keys = sc.enumerateKeys();
			if (this.keys.length > 0) {
				this.state = "enterdata";
			} else {
				this.reportError("No keys found on card");
			}
			break;
		case "sign":
			var ks = new HSMKeyStore(sc);

			var keys = ks.enumerateKeys()

			var key = ks.getKey(this.key);
			var cert = ks.getCertificate(this.key);
			var cvc = new CVC(cert);

			var pka = this.hsmstate.pka;
			if (!pka) {
				this.reportError("Target device no longer online");
				return;
			}

			var status = pka.checkKeyStatus(cvc.getCHR());

			if (status == ManagePKA.KEY_NOT_FOUND) {
				this.reportError("Key not registered as public key for authentication");
				return;
			}

			if (status == ManagePKA.KEY_ALREADY_AUTHENTICATED) {
				this.reportError("Key already authenticated");
				return;
			}

			pka.performAuthentication(sc, key);

			this.result = "Public key authentication successful";
			this.state = "success";
			break;
		default:
			GPSystem.trace("Unexpected handleCardAction in state " + this.state);
	}
}
