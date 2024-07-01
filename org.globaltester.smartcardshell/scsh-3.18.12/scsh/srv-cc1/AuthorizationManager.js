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
 * @fileoverview Manage client authorization
 */



function AuthorizationManager() {
	this.roleMap = {};
	this.userMap = {};
}

exports.AuthorizationManager = AuthorizationManager;



AuthorizationManager.DEFAULT_USER_ID = "default";



AuthorizationManager.prototype.addRole = function(role) {
	this.roleMap[role.id] = role;
}



/**
 * Add a user to the Authorization Manager
 *
 * @param {User} user the user
 */
AuthorizationManager.prototype.addUser = function(user) {
	var role = this.roleMap[user.role];
	if (typeof(role) == "undefined") {
		throw "User has undefined role";
	}
	this.userMap[user.id] = user;
}



AuthorizationManager.prototype.getUser = function(id) {
	var user = this.userMap[id];
	if (user) {
		return user;
	}
	return this.userMap[AuthorizationManager.DEFAULT_USER_ID];
}



AuthorizationManager.prototype.loginAllowed = function(id) {
	var user = this.userMap[id];
	if (typeof(user) == "undefined") {
		return false;
	}
	return this.roleMap[user.role].loginAllowed;
}
