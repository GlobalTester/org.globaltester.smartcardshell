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
 * @fileoverview Plug-In Template
 */


/**
 * Create a plug-in instance
 *
 * @constructor
 * @class A plug-in example
 * @param {KeyManager] km the associated key manager
 */
function PluginExample(km) {
	this.km = km;
}

// All plug-ins must export a symbol "Plugin"
exports.Plugin = PluginExample;

PluginExample.PLUGIN_ACTION = "Test-Plugin";



/**
 * Add an entry to the context menu associated with the device entry in the outline
 *
 * @param {String[]} contextMenu the list of entries in the context menu
 * @param {Boolean} isInitialized the device is initialized
 * @param {Number} authenticationState the status returned in the last authentication query (SW1/SW2)
 */
PluginExample.prototype.addDeviceContextMenu = function(contextMenu, isInitialized, authenticationState) {
	print("isInitialized: " + isInitialized);
	print("authenticationState: " + authenticationState.toString(16));
	contextMenu.push(PluginExample.PLUGIN_ACTION);
}



/**
 * Supplement additional key domain infos
 *
 * Called after the key domain entry has been created in the outline.
 * The dom object contains the properties
 *
 * kdid - The index in the list of key domains
 * status - The status as returned by SmartCardHSM.parseKeyDomainStatus()
 * node  The associated Outline node
 *
 * @param {Object} dom key domain information
 */
PluginExample.prototype.addKeyDomainInformation = function(dom) {
}



/**
 * Postprocessing after a key domain delete
 *
 * Called after the key domain entry has been delete in the outline.
 * The dom object contains the properties
 *
 * kdid - The index in the list of key domains
 * status - The status as returned by SmartCardHSM.parseKeyDomainStatus()
 * node  The associated Outline node
 *
 * @param {Object} dom key domain information
 */
PluginExample.prototype.deleteKeyDomain = function(dom) {
}



/**
 * Add an entry to the context menu associated with a key domain in the outline
 *
 * @param {String[]} contextMenu the list of entries in the context menu
 * @param {Number} authenticationState the status returned in the last authentication query (SW1/SW2)
 * @param {Object} dom key domain information
 */
PluginExample.prototype.addKeyDomainContextMenu = function(contextMenu, authenticationState, keydomainnode) {
}



/**
 * Supplement additional key infos
 *
 * @param {Outline} keynode the node created for this key. The key object is stored in the key property.
 */
PluginExample.prototype.addKeyInformation = function(keynode) {
}



/**
 * Add an entry to the context menu associated with a key in the outline
 *
 * @param {String[]} contextMenu the list of entries in the context menu
 * @param {Number} authenticationState the status returned in the last authentication query (SW1/SW2)
 * @param {Outline} keynode the node created for this key before it is added to the outline
 */
PluginExample.prototype.addKeyContextMenu = function(contextMenu, authenticationState, keynode) {
	print("authenticationState: " + authenticationState.toString(16));
	contextMenu.push(PluginExample.PLUGIN_ACTION);
}



/**
 * Postprocessing after a key delete
 *
 * @param {Object} key key node in the outline
 */
PluginExample.prototype.deleteKey = function(node) {
}



/**
 * Handle action triggered from the outline context menu
 *
 * @param {Outline} source the source outline node of this action
 * @param {String} action the action selected from the context menu
 * @type Boolean
 * @return true if the action was handled
 */
PluginExample.prototype.actionListener = function(source, action) {
	print("Source: " + source);
	print("Action: " + action);
	return action.equals(PluginExample.PLUGIN_ACTION);
}



PluginExample.prototype.toString = function() {
	return "Test-Plugin 1";
}
