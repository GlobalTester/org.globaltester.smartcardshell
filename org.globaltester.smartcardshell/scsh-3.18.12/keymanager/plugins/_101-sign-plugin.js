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

var CVC = require("scsh/eac/CVC").CVC;


/**
 * Create a plug-in instance
 *
 * @constructor
 * @class A plug-in example
 * @param {KeyManager] km the associated key manager
 */
function SignExample(km) {
	this.km = km;
}

// All plug-ins must export a symbol "Plugin"
exports.Plugin = SignExample;

SignExample.PLUGIN_ACTION = "Sign Data";



/**
 * Add an entry to the context menu associated with the device entry in the outline
 *
 * @param {String[]} contextMenu the list of entries in the context menu
 * @param {Boolean} isInitialized the device is initialized
 * @param {Number} authenticationState the status returned in the last authentication query (SW1/SW2)
 */
//SignExample.prototype.addDeviceContextMenu = function(contextMenu, isInitialized, authenticationState) {
//}



/**
 * Add an entry to the context menu associated with a key in the outline
 *
 * @param {String[]} contextMenu the list of entries in the context menu
 * @param {Number} authenticationState the status returned in the last authentication query (SW1/SW2)
 * @param {Outline} keynode the node created for this key before it is added to the outline
 */
SignExample.prototype.addKeyContextMenu = function(contextMenu, authenticationState, keynode) {
	if (authenticationState == 0x9000) {
		contextMenu.push(SignExample.PLUGIN_ACTION);
	}
}



/**
 * Handle action triggered from the outline context menu
 *
 * @param {Outline} source the source outline node of this action
 * @param {String} action the action selected from the context menu
 * @type Boolean
 * @return true if the action was handled
 */
SignExample.prototype.actionListener = function(source, action) {
	print("Source: " + source);
	print("Action: " + action);
	if (!action.equals(SignExample.PLUGIN_ACTION)) {
		return false;
	}

	var key = source.key;

	var crypto = this.km.sc.getCrypto();
	var algo = Crypto.RSA_PSS_SHA256;

	var str = Dialog.prompt("Enter message to sign", "Hello World");
	assert(str != null, "Abort by user");

	var msg = new ByteString(str, ASCII);
	var signature = crypto.sign(key, algo, msg);
	print("Signature : " + signature);

	var cert = source.childs[source.childs.length - 1].cert;

	if (cert.byteAt(0) == 0x30) {
		cert = new X509(cert);
	} else {
		cert = new CVC(cert);
	}
	print(cert);

	var crypto = new Crypto();
	var valid = crypto.verify(cert.getPublicKey(), algo, msg, signature);

	print("Signature is " + (valid ? "valid" : "invalid"));
	return true;
}



SignExample.prototype.toString = function() {
	return "Sign-Plugin";
}
