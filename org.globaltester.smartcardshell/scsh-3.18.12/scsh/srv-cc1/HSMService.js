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
 * @fileoverview A simple HSM maintaince service
 */

var SmartCardHSM		= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSM;
var SmartCardHSMInitializer	= require('scsh/sc-hsm/SmartCardHSM').SmartCardHSMInitializer;
var ManagePKA			= require('scsh/sc-hsm/ManagePKA').ManagePKA;
var EACCryptoProvider		= require('scsh/sc-hsm/EACCryptoProvider').EACCryptoProvider;
var CryptoProvider		= require('scsh/sc-hsm/CryptoProvider').CryptoProvider;
var HSMUI			= require('scsh/srv-cc1/HSMUI').HSMUI;



/**
 * Class implementing the SmartCard-HSM management service
 *
 * @constructor
 */
function HSMService() {
	this.type = "SC-HSM";
	this.name = "Management";
	this.hsmlist = [];
	this.hsmmap = [];
	this.crypto = new Crypto();
	this.authenticationRequired = false;
	this.roleRequired = 0;
}

exports.HSMService = HSMService;



/**
 * Create a new UI session
 *
 * @param {HttpSession} session the new session context
 */
HSMService.prototype.newUI = function(session) {
	var ui = new HSMUI(this, session);
	return ui;
}



/**
 * Add HSMState to managed list, possibly updating existing state object
 *
 * @param {HSMState} hsm the state object
 */
HSMService.prototype.addOrUpdateHSMState = function(state) {
	var oldstate = this.hsmmap[state.path];
	if (oldstate) {
		oldstate.path = state.path;
		oldstate.sc = state.sc;
		oldstate.deviceId = state.deviceId;
		oldstate.error = state.error;
		return oldstate;
	} else {
		this.hsmmap[state.path] = state;
		this.hsmlist.push(state);
		return state;
	}
}



/**
 * Return a list of registered HSMs
 * @type String[]
 * @return the list of HSM path identifier
 */
HSMService.prototype.getHSMList = function() {
	var list = [];
	for (var i = 0; i < this.hsmlist.length; i++) {
		list.push(this.hsmlist[i].path);
	}
	return list;
}



/**
 * Obtain card service for device
 *
 * @param {HSMState} hsm the state object
 * @param {Card} the card object representing the link to the device
 */
HSMService.prototype.getCardService = function(state, card) {
	try	{
		var sc = new SmartCardHSM(card);
	}
	catch(e if e instanceof GPError) {
		throw new GPError(module.id, GPError.DEVICE_FAILED, 0, "This does not seem to be a SmartCard-HSM");
	}

	// Determine device unique path
	var devAutCert = sc.readBinary(SmartCardHSM.C_DevAut);
	var chain = SmartCardHSM.validateCertificateChain(this.crypto, devAutCert);
	if (chain == null) {
		throw new GPError(module.id, GPError.CRYPTO_FAILED, 0, "Could not validate device certificate. Is this a genuine SmartCard-HSM ?");
	}
	if (state.path) {
		if (chain.path != state.path) {
			throw new GPError(module.id, GPError.DEVICE_ERROR, 0, "Device is " + chain.path + " but should be " + state.path +
			". Please insert correct SmartCard-HSM or connect to a different SmartCard-HSM" );
		}
	} else {
		state.path = chain.path;
	}

	state.deviceId = chain.devicecert.getCHR().getBytes();
	if (state.protectedPINEntry) {
		var cs = sc.getNativeCardService();
		cs.useClassThreePinPad(true);
	}
	state.error = undefined;
	state.sc = sc;
	state.update();
}



/**
 * Add local SmartCard-HSM to managed list
 *
 * If the path is already known, then the device is added as offline device.
 *
 * @param {String} readerName card reader name, can be empty to any reader
 * @param {Boolean} protectedPINEntry use PIN PAD or PIN Dialog
 * @param {String} path identifier of SmartCard-HSM, if already known
 * @param {ByteString} pin optional PIN value
 */
HSMService.prototype.addLocalHSM = function(readerName, protectedPINEntry, path, pin) {
	var state;

	if (path) {
		state = this.hsmmap[path];
		if (!state) {
			state = new HSMState(path);
			state = this.addOrUpdateHSMState(state);
			state.isLocal = true;
		}
		state.protectedPINEntry = protectedPINEntry;
	} else {
		var card = new Card(readerName);
		state = new HSMState();
		state.protectedPINEntry = protectedPINEntry;
		this.getCardService(state, card);
		state = this.addOrUpdateHSMState(state);
		state.isLocal = true;
	}
	state.readerName = readerName;
	state.pin = pin;
}



/**
 * Handle inbound request from remote terminal
 *
 * @param {HttpSession} session the session object
 * @param {String} pathInfo the pathinfo part of the URL
 */
HSMService.prototype.handleCard = function(session, pathInfo) {
	GPSystem.trace("Handle card for session " + session.id);
	if (session.cardTerminal) {
		var card = new Card(session.cardTerminal);
	} else {
		var card = new Card(session.id);
	}
	var ct = card.nativeCardTerminal;

	try	{
		var state = new HSMState();
		this.getCardService(state, card);
		state = this.addOrUpdateHSMState(state);
		delete state.cp;
		state.isLocal = false;

		state.update();
	}
	catch(e if e instanceof GPError) {
		GPSystem.log(GPSystem.ERROR, module.id, e);
		ct.sendNotification(-1, "Failure talking to card. Is this a SmartCard-HSM ?");
		GPSystem.trace(e);
	}
}



/**
 * Return the full list of maintained states
 *
 * @type HSMState[]
 * @return the list of maintained HSM states
 */
HSMService.prototype.getHSMStates = function() {
	return this.hsmlist;
}



/**
 * Try to bring local HSM online
 *
 * @param {HSMState} state the HSM state object
 */
HSMService.prototype.bringOnline = function(state) {
	assert(state instanceof HSMState, "Argument must be of type HSMState");

	var card = new Card(state.readerName);
	this.getCardService(state, card);
}



/**
 * Return true if SmartCard-HSM with given path is registered
 *
 * @type boolean
 * @return true if this HSM is known
 */
HSMService.prototype.hasHSM = function(path) {
	return (typeof(this.hsmmap[path]) != "undefined");
}



/**
 * Return updated HSM state for given device
 *
 * If it is a local device and it is currently offline, then try to bring the device online
 *
 * @param {String} path the device id
 * @type HSMState
 * @return the state object
 */
HSMService.prototype.getHSMState = function(path) {
	var state = this.hsmmap[path];
	if (state) {
		if (state.isOffline() && state.isLocal) {
			try	{
				this.bringOnline(state);
			}
			catch(e if e instanceof GPError) {
				GPSystem.log(GPSystem.ERROR, module.id, e);
				state.error = e.message;
				return state;
			}
		}
		state.update();
	}
	return state;
}



/**
 * Perform User PIN verification
 *
 * @param {HSMState} hsm the state object
 * @param {String} pin the optional provided PIN
 * @type String
 * @return Result string
 */
HSMService.prototype.verifyUserPIN = function(hsm, pin) {
	if (!hsm.sc) {
		return "HSM is offline";
	}

	try	{
		if (pin) {
			hsm.pinsw = hsm.sc.verifyUserPIN(new ByteString(pin, ASCII));
		} else {
			hsm.pinsw = hsm.sc.verifyUserPIN();
		}
	}
	catch(e if e instanceof GPError) {
		GPSystem.log(GPSystem.ERROR, module.id, "PIN verification failed with " + e.message);
		hsm.pinsw = hsm.sc.queryUserPINStatus();
	}

	return SmartCardHSM.describePINStatus(hsm.pinsw, "User PIN");
}



/**
 * Return a EACCryptoProvider instance for the SmartCard-HSM identified by the parameter id
 *
 * @param {String} id the SmartCard-HSM id
 * @param {Boolean} requireLogin require that the return provider is logged-in and as such operational
 * @type EACCryptoProvider
 * @return a crypto provider bound to the SmartCard-HSM. Authentication has been assured
 */
HSMService.prototype.assertCryptoProvider = function(id, requireLogin) {
	GPSystem.log(GPSystem.DEBUG, module.id, "assertCryptoProvider('" + id + "," + requireLogin + "')");

	assert(typeof(id) == "string", "Argument must be string");
	assert(typeof(requireLogin) == "boolean", "Argument must be boolean");

	var state = this.hsmmap[id];

	if (!state) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "No provider for " + id + " found");
	}

	state.update();

	if (state.isOffline()) {
		delete state.cp;
		if (state.isLocal) {
			this.bringOnline(state);
		} else {
			throw new GPError(module.id, GPError.DEVICE_ERROR, 0, "Device " + state.path + " is offline");
		}
	}

	if (requireLogin && !state.isUserAuthenticated()) {
		if (state.hasProtectedPINEntry()) {
			state.pinsw = state.sc.verifyUserPIN();
			if (state.pinsw != 0x9000) {
				throw new GPError(module.id, GPError.AUTHENTICATION_FAILED, 0, "PIN Verification failed");
			}
		} else if (state.pin) {
			state.sc.verifyUserPIN(state.pin);
		} else {
			throw new GPError(module.id, GPError.DEVICE_ERROR, 0, "Device " + state.path + " is not logged in");
		}
	}
	return state;
}



/**
 * Return a EACCryptoProvider instance for the SmartCard-HSM identified by the parameter id
 *
 * @param {String} id the SmartCard-HSM id
 * @param {Boolean} requireLogin require that the return provider is logged-in and as such operational
 * @type EACCryptoProvider
 * @return a crypto provider bound to the SmartCard-HSM. Authentication has been assured
 */
HSMService.prototype.getEACCryptoProvider = function(id, requireLogin) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getEACCryptoProvider('" + id + "," + requireLogin + "')");
	var state = this.assertCryptoProvider(id, requireLogin);

	if (!state.cp) {
		state.cp = new EACCryptoProvider(state.sc, state.path);
	}

	return state.cp;
}



/**
 * Return a CryptoProvider instance for the SmartCard-HSM identified by the parameter id
 *
 * @param {String} id the SmartCard-HSM id
 * @param {Boolean} requireLogin require that the return provider is logged-in and as such operational
 * @typeCryptoProvider
 * @return a crypto provider bound to the SmartCard-HSM. Authentication has been assured
 */
HSMService.prototype.getCryptoProvider = function(id, requireLogin) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCryptoProvider('" + id + "," + requireLogin + "')");
	var state = this.assertCryptoProvider(id, requireLogin);

	if (!state.cp) {
		state.cp = new CryptoProvider(state.sc, state.path);
	}

	return state.cp;
}



/**
 * Reinitialize and clear all keys on the device
 *
 * This method is only used during testing when the database is reset and shall ensure
 * that all keys are removed as well. This method uses the default SO-PIN and User-PIN.
 */
HSMService.prototype.reinitializeHSM = function(id) {
	assert(typeof(id) == "string", "Argument must be string");

	var state = this.hsmmap[id];

	if (!state) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "No provider for " + id + " found");
	}

	state.update();

	if (state.isOffline()) {
		if (state.isLocal) {
			this.bringOnline(state);
		} else {
			throw new GPError(module.id, GPError.DEVICE_ERROR, 0, "Device " + state.path + " is offline");
		}
	}

	if (state.isOffline()) {
		throw new GPError(module.id, GPError.DEVICE_ERROR, 0, "Device " + state.path + " is offline");
	}

	var sci = new SmartCardHSMInitializer(state.sc.card);
	if (state.pin) {
		sci.setUserPIN(state.pin);
	}
	sci.initialize();

	state.protectedPINEntry = false;
	state.pin = sci.userPIN;

	delete state.cp;
}



HSMService.prototype.toString = function() {
	return "HSMService for SmartCard-HSM";
}



/**
 * Maintain the SmartCard-HSM state information
 *
 * @param {String} path the SmartCard-HSM unique identifier
 * @constructor
 */
function HSMState(path) {
	this.path = path;
	this.isLocal = false;
}



/**
 * Returns true if SmartCard-HSM is no longer connected
 *
 * @type boolean
 * @return true if disconnected
 */
HSMState.prototype.isOffline = function() {
	return !this.sc;
}



/**
 * Returns true if protected PIN verification is supported
 *
 * @type boolean
 * @return true if protected PIN supported
 */
HSMState.prototype.hasProtectedPINEntry = function() {
	return this.protectedPINEntry;
}



/**
 * Returns true if user is authenticated
 *
 * @type boolean
 * @return true if user is authenticated
 */
HSMState.prototype.isUserAuthenticated = function() {
	return this.pinsw == 0x9000;
}



/**
 * Update status
 */
HSMState.prototype.update = function() {
	if (this.isOffline()) {
		return;
	}

	try	{
		this.pinsw = this.sc.queryUserPINStatus();

		this.pka = new ManagePKA(this.sc, this.deviceId);

		if (!this.pka.isActive()) {
			this.pka = null;
		}
	}
	catch(e if e instanceof GPError) {
		GPSystem.log(GPSystem.INFO, module.id, "Device " + this.path + " failed with " + e.message);
		this.error = e.message;
		this.sc = undefined;		// Device is offline, e.g. removed
	}
}



/**
 * Logout from SmartCard-HSM
 */
HSMState.prototype.logout = function() {
	if (!this.sc) {
		return;
	}

	this.sc.logout();
	this.update();
}



/**
 * Disconnect remote connection
 */
HSMState.prototype.disconnect = function() {
	if (!this.sc) {
		return;
	}
	this.sc.card.close();
	this.sc = null;
	this.pka = null;
}



HSMState.prototype.toString = function() {
	return (this.isLocal ? "Local: " : "Remote: ") + this.path;
}
