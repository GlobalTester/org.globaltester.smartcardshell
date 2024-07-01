/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2009 CardContact Software & System Consulting
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
 * @fileoverview DAO Factory for file system based persistence
 */


var File = require('scsh/file/File').File;
var HolderDAO = require('scsh/pki-db/fs/HolderDAO').HolderDAO;
var SignerDAO = require('scsh/pki-db/fs/SignerDAO').SignerDAO;
var RequestDAO = require('scsh/pki-db/fs/RequestDAO').RequestDAO;
var CertificateDAO = require('scsh/pki-db/fs/CertificateDAO').CertificateDAO;



/**
 * A factory that can create data access objects for the PKI database
 *
 * @param {String} path the root directory for the file system structure
 */
function DAOFactoryFileSystem(path) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new(" + path + ")");
	this.basepath = path;
}

exports.DAOFactoryFileSystem = DAOFactoryFileSystem;



DAOFactoryFileSystem.prototype.toString = function() {
	return "FSDAO";
}



DAOFactoryFileSystem.prototype.getHolderDAO = function() {
	if (typeof(this.holderDAO) == "undefined") {
		this.holderDAO = new HolderDAO(this);
	}
	return this.holderDAO;
}



DAOFactoryFileSystem.prototype.getCertificateDAO = function() {
	if (typeof(this.certificateDAO) == "undefined") {
		this.certificateDAO = new CertificateDAO(this);
	}
	return this.certificateDAO;
}



DAOFactoryFileSystem.prototype.getSignerDAO = function() {
	if (typeof(this.signerDAO) == "undefined") {
		this.signerDAO = new SignerDAO(this);
	}
	return this.signerDAO;
}



DAOFactoryFileSystem.prototype.getRequestDAO = function() {
	if (typeof(this.requestDAO) == "undefined") {
		this.requestDAO = new RequestDAO(this);
	}
	return this.requestDAO;
}



/**
 * Check path for legal encodings
 *
 * @private
 */
DAOFactoryFileSystem.checkPath = function(path) {
	if ((path.indexOf("/..") >= 0) ||
		(path.indexOf("../") >= 0) ||
		(path.indexOf("\\..") >= 0) ||
		(path.indexOf("..\\") >= 0) ||
		(path.indexOf("\0") >= 0) ||
		(path.indexOf("~") >= 0)) {
		throw new GPError("DAOFactoryFileSystem", GPError.INVALID_ARGUMENTS, 0, "Path \"" + path + "\" contains illegal characters");
	}
}



/**
 * Map to absolute path on file system
 * @param {String} path the relative path
 * @type String
 * @return the absolute path on the file system
 * @private
 */
DAOFactoryFileSystem.prototype.mapPath = function(path) {
	DAOFactoryFileSystem.checkPath(path);
	return this.basepath + path;
}



/**
 * Enumerate file name under the given path
 *
 * @param {String} path the relative path
 * @param {Regex} the filter criteria. Directories if null or not defined
 * @private
 */
DAOFactoryFileSystem.prototype.enumerateFiles = function(path, filter) {

	var result = [];

	var fn = this.mapPath(path);
	var f = new java.io.File(fn);
	if (!f.exists()) {
		return result;
	}
	var files = f.list();

	for (var i = 0; i < files.length; i++) {
		var s = new String(files[i]);
		var fd = new java.io.File(f, s);

		if (filter) {
			var n = s.match(filter);
		} else {
			var n = fd.isDirectory();
		}
		if (n) {
			result.push(s);
		}
	}
	return result;
}



/**
 * Loads a binary file from disk
 *
 * @param {String} filename the fully qualified file name
 * @return the binary content
 * @type ByteString
 */
DAOFactoryFileSystem.prototype.loadBinaryFile = function(name) {
	var fn = this.mapPath(name);
	var f = new File(fn);

	var data = f.readAllAsBinary();
	f.close();

	return data;
}



/**
 * Saves a binary file to disk
 *
 * @param {String} name the file name appended to the base path
 * @param {ByteString} data the binary content
 */
DAOFactoryFileSystem.prototype.saveBinaryFile = function(name, data) {
	var fn = this.mapPath(name);
	var f = new File(fn);
	f.writeAll(data);
	f.close();
}



/**
 * Loads a XML file from disk
 *
 * @param {String} filename the fully qualified file name
 * @return the XML content
 * @type XML
 */
DAOFactoryFileSystem.loadXMLFile = function(filename) {
	// Open stream
	var f = new java.io.FileReader(filename);
	var bfr = new java.io.BufferedReader(f);

	// Skip processing instructions
	var result;
	do	{
		result = bfr.readLine();
	} while ((result != null) && (result.substr(0, 2) == "<?"));

	if (result == null) {
		bfr.close();
		f.close();
		return null;
	}

	var line;
	while ((line = bfr.readLine()) != null) {
		result += line + "\n";
	}
	bfr.close();
	f.close();
	default xml namespace = "";
	return new XML(result);
}



/**
 * Saves XML to disk
 *
 * @param {String} filename the fully qualified file name
 * @param {XML} data the XML content
 */
DAOFactoryFileSystem.saveXMLFile = function(filename, xml) {
	var fw = new java.io.FileWriter(filename);
	fw.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
	fw.write(xml.toXMLString());
	fw.close();
}




/**
 * Load configuration
 *
 * @param {String} path the relative path of the PKI element (e.g. "UTCVCA1/UTDVCA1")
 * @return the configuration object or null if none defined
 * @type XML
 */
DAOFactoryFileSystem.prototype.loadConfig = function(path) {
	var fn = this.mapPath(path + "/config.xml");
	var cfgxml = null;

	try	{
		var cfgxml = DAOFactoryFileSystem.loadXMLFile(fn);
	}
	catch(e) {
//		GPSystem.trace(e);
	}
	return cfgxml;
}



/**
 * Save configuration
 *
 * <p>This method will create the necessary path and save the configuration to config.xml</p>

 * @param {String} path the relative path of the PKI element (e.g. "UTCVCA1/UTDVCA1")
 * @param {XML} cfg the configuration object
 */
DAOFactoryFileSystem.prototype.saveConfig = function(path, cfg) {

	if (arguments.length != 2) {
		throw new GPError("DAOFactoryFileSystem", GPError.INVALID_ARGUMENTS, 0, "path and cfg argument required");
	}

	var fn = this.mapPath(path);
	var f = new java.io.File(fn);
	if (!f.exists()) {
		f.mkdirs();
	}

	var fn = this.mapPath(path + "/config.xml");
	DAOFactoryFileSystem.saveXMLFile(fn, cfg);
}



/**
 * Create a default configuration
 *
 * @returns a suitable default configuration object
 * @type XML
 */
DAOFactoryFileSystem.prototype.getDefaultConfig = function() {
	default xml namespace = "";
	var defaultCfg =
		<CAConfig>
			<sequence>
				<current>0</current>
			</sequence>
		</CAConfig>;
	return defaultCfg;
}



/**
 * Delete file
 */
DAOFactoryFileSystem.prototype.deleteFile = function(name) {
	var fn = this.mapPath(name);
	var f = new java.io.File(fn);
	return f["delete"]();		// delete is a reserved keyword
}
