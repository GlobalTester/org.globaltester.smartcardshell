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
 * @fileoverview Internationalization Support
 */


var I18N = { FallbackToDefaultLang: true, EnforceDefaultLang: false };

exports.I18N = I18N;

var Map = {};
var DefaultLang;


/**
 * Add a resource table from within the code
 *
 * @param {Object[]} res array of resource objects with a property lang that denotes the language and keys that contains a map of key to messages
 */
I18N.addResources = function(res) {
	assert(typeof(res) == "object", "Argument res must be of type array");
	assert(res.length > 0, "Argument can't be empty");

	var lang = res[0].lang;
	var map = Map[lang];
	if (!map) {
		print("New default map for " + lang);
		map = { lang: lang };
		DefaultLang = lang;
		Map[lang] = map;
	}

	for (var key in res[0].keys) {
		if (typeof(map[key]) != "undefined") {
			GPSystem.log(GPSystem.WARN, module.id, "Key " + key + " defined more than once");
		}
		map[key] = res[0].keys[key];
	}
	for (var i = 1; i < res.length; i++) {
		var map = Map[res[i].lang];
		if (!map) {
			print("New translation map for " + res[i].lang);
			map = { lang: res[i].lang };
			Map[res[i].lang] = map;
		}
		for (var key in res[0].keys) {
			var str = res[i].keys[key];
			if (!str) {
				GPSystem.log(GPSystem.DEBUG, module.id, "No translation found for " + key + " in " + res[i].lang);
				str = res[0].keys[key];
			}
			map[key] = str;
		}
	}
}



/**
 * Translate key into message
 *
 * @param {String/Object} lang either the language string or the map returned by I18N.getMap().
 * @param {String} key the key to translate
 * @type String
 * @return the translated messages
 */
I18N.t = function(lang, key) {
	if (typeof(lang) == "string") {
		lang = I18N.getMap(lang);
	}

	var s = lang[key];
	if (s == undefined) {
		if (lang.lang == DefaultLang) {
			s = key;
		} else {
			if (I18N.FallbackToDefaultLang) {
				s = I18N.t(Map[DefaultLang], key)
			} else {
				s = key;
			}
		}
	}
	return s;
}



/**
 * Return the map for a given language. Use this call to reduce map lookup in I18N.t()
 *
 * @param {String} lang the language code, e.g. "EN" for English
 * @type Object
 * @return the map
 */
I18N.getMap = function(lang) {
	if (I18N.EnforceDefaultLang) {
		lang = DefaultLang;
	}
	var m = Map[lang];
	if (m == undefined) {
		m = Map[DefaultLang];;
	}
	return m;
}
