/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2006 CardContact Software & System Consulting
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
 * @fileoverview Plug-In
 */


/**
 * Create a plug-in instance
 *
 * @constructor
 * @class A plug-in example
 * @param {KeyManager] km the associated key manager
 */
function ManagementToken(km) {
	this.km = km;
}

// All plug-ins must export a symbol "Plugin"
exports.Plugin = ManagementToken;

ManagementToken.USE_TOKEN_ACTION = "Use as Management Token";
ManagementToken.RELEASE_TOKEN_ACTION = "Release Management Token";



/**
 * Add an entry to the context menu associated with the device entry in the outline
 *
 * @param {String[]} contextMenu the list of entries in the context menu
 * @param {Boolean} isInitialized the device is initialized
 * @param {Number} authenticationState the status returned in the last authentication query (SW1/SW2)
 */
ManagementToken.prototype.addDeviceContextMenu = function(contextMenu, isInitialized, authenticationState) {
	if (typeof(this.km.managementToken) == "undefined") {
		if (isInitialized && authenticationState == 0x9000) {
			contextMenu.push(ManagementToken.USE_TOKEN_ACTION);
		}
	} else {
		contextMenu.push(ManagementToken.RELEASE_TOKEN_ACTION);
	}
}



/**
 * Use the current token as management token
 *
 */
ManagementToken.prototype.useAsManagementToken = function() {
	this.sc = this.km.sc;
	this.ks = this.km.ks;
	this.id = this.km.id;
	this.certchain = this.km.certchain;
	this.km.managementToken = this;
	this.km.autoInsert = true;

	var keys = this.sc.getKeys();
	for (var i = 0; i < keys.length; i++) {
		var key = keys[i];
		if ((key.getType() == "AES") && (key.algorithms.find(ByteString.valueOf(SmartCardHSM.ALG_CMAC)) >= 0)) {
			this.tmk = key;
			var label = key.getLabel();
			this.kcv = key.getPKCS15Id();
			if (this.kcv.length != 8) {
				print("No subject key identifier found. Generating one...");
				this.kcv = this.tmk.sign(Crypto.AES_CMAC, new ByteString("KeyCheckValue", ASCII)).left(8);
			}
			print("Found AES key '" + label + "' with KCV " + this.kcv.toString(HEX) + " to manage the SO-PIN");
			break;
		}
	}

	this.task = new Task(this);
	this.task.setContextMenu([ ManagementToken.RELEASE_TOKEN_ACTION ]);
	this.km.cardRemoved(this.sc.card.readerName);
	print("See Tasks tab for management token");
}



/**
 * Release and reset the management token
 */
ManagementToken.prototype.releaseManagementToken = function() {
	delete this.km.managementToken;
	this.sc.logout();
	this.sc.card.close();
	this.task.dispose();
}



/**
 * Derive the SO-PIN using the token management key
 */
ManagementToken.prototype.deriveSOPIN = function(id, seed) {
	var inp = new ByteString(id, ASCII);
	if (seed) {
		inp = inp.concat(seed);
	}
	var cmac = this.tmk.sign(Crypto.AES_CMAC, inp);
	return cmac.left(8);
}



/**
 * Handle action triggered from the outline context menu
 *
 * @param {Outline} source the source outline node of this action
 * @param {String} action the action selected from the context menu
 * @type Boolean
 * @return true if the action was handled
 */
ManagementToken.prototype.actionListener = function(source, action) {
	switch(action) {
		case ManagementToken.USE_TOKEN_ACTION:
			this.useAsManagementToken();
			return true;
		case ManagementToken.RELEASE_TOKEN_ACTION:
			this.releaseManagementToken();
			return true;
	}
	return false;
}



ManagementToken.prototype.toString = function() {
	return "Management-Token " + this.id;
}
