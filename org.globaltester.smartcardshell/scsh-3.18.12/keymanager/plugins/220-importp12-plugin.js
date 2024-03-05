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
 * @fileoverview Plug-In to import keys from a PKCS#12 container
 */

var DKEK = require("scsh/sc-hsm/DKEK").DKEK;



/**
 * Create a plug-in instance
 *
 * @constructor
 * @class A plug-in example
 * @param {KeyManager] km the associated key manager
 */
function ImportP12(km) {
	this.km = km;
}

// All plug-ins must export a symbol "Plugin"
exports.Plugin = ImportP12;

ImportP12.PLUGIN_ACTION = "Import from PKCS#12";



/**
 * Add an entry to the context menu associated with the device entry in the outline
 *
 * @param {String[]} contextMenu the list of entries in the context menu
 * @param {Boolean} isInitialized the device is initialized
 * @param {Number} authenticationState the status returned in the last authentication query (SW1/SW2)
 */
ImportP12.prototype.addDeviceContextMenu = function(contextMenu, isInitialized, authenticationState) {
	if (authenticationState == 0x9000) {
		contextMenu.push(ImportP12.PLUGIN_ACTION);
	}
}



/**
 * Add an entry to the context menu associated with a key in the outline
 *
 * @param {String[]} contextMenu the list of entries in the context menu
 * @param {Number} authenticationState the status returned in the last authentication query (SW1/SW2)
 * @param {Outline} keynode the node created for this key before it is added to the outline
 */
ImportP12.prototype.addKeyContextMenu = function(contextMenu, authenticationState, keynode) {
}



/**
 * Handle action triggered from the outline context menu
 *
 * @param {Outline} source the source outline node of this action
 * @param {String} action the action selected from the context menu
 * @type Boolean
 * @return true if the action was handled
 */
ImportP12.prototype.actionListener = function(source, action) {
//	print("Source: " + source);
//	print("Action: " + action);
	if (!action.equals(ImportP12.PLUGIN_ACTION)) {
		return false;
	}

	this.importP12();

	return true;
}


ImportP12.prototype.importP12 = function() {
	var sc = this.km.sc;
	var crypto = this.km.crypto;

	var kdid = -1;
	do {
		kdid++;
		var kd = sc.queryKeyDomainStatus(kdid);
		if ((kd.sw == 0x6A86) || (kd.sw == 0x6D00)) {
			Dialog.prompt("No empty key domain found.");
			return
		}
	} while (kd.sw != 0x6A88);

	// Create DKEK domain with random DKEK
	sc.createDKEKKeyDomain(kdid, 1);
	var share = crypto.generateRandom(32);
	sc.importKeyShare(kdid, share);

	// Create DKEK encoder and import share
	var dkek = new DKEK(crypto);
	dkek.importDKEKShare(share);

	do	{
		var file = Dialog.prompt("Select PKCS#12 container", "", null, "*.p12");

		if (file == null) {
			return;
		}

		var pwd = Dialog.prompt("Enter PKCS#12 password", "*");

		if (pwd == null) {
			return;
		}

		var p12 = new KeyStore("BC", "PKCS12", file, pwd);

		var aliases = p12.getAliases();

		do	{
			var alias = Dialog.prompt("Select key", "", aliases);
			assert(alias != null);

			var key = new Key();
			key.setType(Key.PRIVATE);
			key.setID(alias);
			try	{
				p12.getKey(key);
			}
			catch(e) {
				print(e);
				key = null;
			}
			var cert = p12.getCertificate(alias);

			print(cert);

			do	{
				var alias = Dialog.prompt("Enter key name for import", alias);
				if (alias == null) {
					return;
				}
				if (!this.km.ks.hasKey(alias)) {
					break;
				}
				Dialog.prompt("A key with label " + alias + " does already exists. Please choose a different name");
			} while (1);

			if (key != null) {
				print("Importing key and certificate...");

				var pubkey = cert.getPublicKey();
				var blob = dkek.encodeKey(key, pubkey);

				if (pubkey.getComponent(Key.MODULUS)) {
					hkey = this.km.ks.importRSAKey(alias, blob, pubkey.getSize());
					var signalgo = Crypto.RSA_PSS_SHA256;
				} else {
					hkey = this.km.ks.importECCKey(alias, blob, pubkey.getSize());
					var signalgo = Crypto.ECDSA_SHA256;
				}

				this.km.ks.storeEndEntityCertificate(alias, cert);

				// Test import
				var msg = new ByteString("Hello World", ASCII);

				var signature = hkey.sign(signalgo, msg);

				assert(crypto.verify(pubkey, signalgo, msg, signature), "Signature verification of imported key failed");
				print("Import completed");
			} else {
				var str = "OK";
				if (sc.getCACertificate(alias)) {
					str = Dialog.prompt("CA Certificate alias does exists (OK to overwrite)");
				}

				if (str == "OK") {
					print("Importing certificate...");

					this.km.ks.storeCACertificate(alias, cert);
				}
			}
			this.km.createOutline();
		} while (aliases.length > 1 && Dialog.prompt("Import more keys ?"));

	} while (Dialog.prompt("Import more PKCS#12 files ?"));
	dkek.clear();
	sc.deleteKEK(kdid);
}



ImportP12.prototype.toString = function() {
	return "ImportP12-Plugin";
}
