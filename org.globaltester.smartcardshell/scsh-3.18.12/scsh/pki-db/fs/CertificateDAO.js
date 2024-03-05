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

Certificate = require('scsh/pki-db/Certificate').Certificate;
Holder = require('scsh/pki-db/Holder').Holder;



/**
 * Data access object for certificates
 *
 * @param {Object} the factory that created this DAO
 */
function CertificateDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.CertificateDAO = CertificateDAO;



CertificateDAO.prototype.toString = function() {
	return "CertificateDAO(fs)";
}



/**
 * Create and persists a new certificate object
 *
 * @param {Holder} holder the holder of this certificate
 * @param {String} serial the serial number of this certificate (full CHR for CVC and decimal serial for X.509)
 * @param {Number} dir one of Certificate.UP, Certificate.SHORT or Certificate.DOWN. See Certificate for explanation
 * @param {ByteString} certbin the binary presentation of the certificate
 * @type Certificate
 * @return the newly created certificate object
 */
CertificateDAO.prototype.newCertificate = function(holder, serial, dir, certbin, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newCertificate(" + holder + "," + serial + "," + dir + "," + certbin.bytes(0,10).toString(HEX) + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(serial, "Parameter serial must not be empty");
	assert(typeof(serial) == "string", "Parameter serial must be a String");
	assert(dir == Certificate.UP || dir == Certificate.SHORT || dir == Certificate.DOWN, "Parameter dir invalid");
	assert(certbin, "Parameter certbin must not be empty");
	assert(certbin instanceof ByteString, "Parameter must be instance of ByteString");
	assert((typeof(template) == "undefined") || (template instanceof Object), "Parameter template be an object");

	var fn = this.getFilename(holder, serial, dir);
	GPSystem.log(GPSystem.INFO, module.id, "Saving certificate to " + fn);
	this.factory.saveBinaryFile(fn, certbin);

	var c = new Certificate(this, holder, serial, dir, certbin, template);

	return c;
}



/**
 * @private
 */
CertificateDAO.prototype.getFilename = function(holder, serial, dir) {
	if ((holder.certificateType & 0xF) == Holder.CVC) {
		switch(dir) {
			case Certificate.UP:
				var fn = holder._path + "/" + serial + ".cvcert";
				break;
			case Certificate.SHORT:
				var fn = holder._path + "/" + serial + ".selfsigned.cvcert";
				break;
			case Certificate.DOWN:
				var fn = holder._path + "/" + serial + ".cross.cvcert";
				break;
			default:
				new GPError(module.id, GPError.INVALID_DATA, dir, "Invalid option in parameter dir");
		}
	} else {
		var fn = holder._path + "/" + serial + ".cer";
	}
	return fn;
}



/**
 * Get certificate identified by serial number for given holder
 *
 * @param {Holder} holder the holder of this certificate
 * @param {String} serial the serial number of this certificate (full CHR for CVC and decimal serial for X.509)
 * @param {Number} dir one of Certificate.UP, Certificate.SHORT or Certificate.DOWN. See Certificate for explanation
 * @type Certificate
 * @return the certificate object or null if not found
 */
CertificateDAO.prototype.getCertificateBySerial = function(holder, serial, dir) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCertificateBySerial(" + holder + "," + serial + "," + dir + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");
	assert(serial, "Parameter serial must not be empty");
	assert(typeof(serial) == "string", "Parameter serial must be a String");
	assert(dir == Certificate.UP || dir == Certificate.SHORT || dir == Certificate.DOWN, "Parameter dir invalid");

	var fn = this.getFilename(holder, serial, dir);

	try	{
		var bin = this.factory.loadBinaryFile(fn);
	}
	catch(e) {
		if ((dir == Certificate.SHORT) || ((holder.certificateType & 0xF) == Holder.X509)) {
			GPSystem.log(GPSystem.DEBUG, module.id, "File " + fn + " not found");
			return null;
		}

		// Look if there is a selfsigned root
		var fn = holder._path + "/" + serial + ".selfsigned.cvcert";
		dir = Certificate.SHORT;

		try	{
			var bin = this.factory.loadBinaryFile(fn);
		}
		catch(e) {
			GPSystem.log(GPSystem.DEBUG, module.id, "File " + fn + " not found");
			return null;
		}
	}

	var c = new Certificate(this, holder, serial, dir, bin);

	if ((holder.certificateType & 0xF) == Holder.X509) {
		var x = new X509(bin);
		c.keyId = x.getSubjectKeyIdentifier();
	}

	return c;
}



/**
 * Get the current certificate in use by this holder
 *
 * @param {Holder} holder the holder of this certificate
 * @type Certificate
 * @return the certificate object or null if no current certificate
 */
CertificateDAO.prototype.getCurrentCertificate = function(holder) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCurrentCertificate(" + holder + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");

	default xml namespace = "";
	var cfg = this.factory.loadConfig(holder._path);
	if (cfg == null) {
		GPSystem.log(GPSystem.DEBUG, module.id, "getCurrentCertificate(" + holder + ") : null");
		return null;
	}

	var str = cfg.sequence.currentCHR.toString();
	if (!str) {
		return null;
	}

	return this.getCertificateBySerial(holder, str, Certificate.UP);
}



/**
 * Get all certificates issued to this holder
 *
 * @param {Holder} holder the holder of the certificates
 * @type Certificate[]
 * @return the list of certificates, which my be empty
 */
CertificateDAO.prototype.enumerateCertificates = function(holder) {
	GPSystem.log(GPSystem.DEBUG, module.id, "enumerateCertificates(" + holder + ")");

	assert(holder, "Parameter holder must not be empty");
	assert(holder instanceof Holder, "Parameter must be instance of Holder");

	var list = this.factory.enumerateFiles(holder._path, /\.(cvcert|CVCERT)$/);
	var result = [];

	for (var i = 0; i < list.length; i++) {
		var str = list[i];
		var bin = this.factory.loadBinaryFile(holder._path + "/" + str);
		var dir = Certificate.UP;

		if (str.indexOf("selfsigned") > 0) {
			dir = Certificate.SHORT;
		} else if (str.indexOf("cross") > 0) {
			dir = Certificate.DOWN;
		}

		var serial = str.match(/(^.+?)\./)[1];
		var c = new Certificate(this, holder, serial, dir, bin);
		result.push(c);
	}
	return result;
}



/**
 * Delete certificate
 *
 * @param {Certificate} certificate the certificate to delete
 * @type boolean
 * @return true if deleted
 */
CertificateDAO.prototype.deleteCertificate = function(certificate) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteCertificate(" + certificate + ")");

	assert(certificate, "Parameter certificate must not be empty");
	assert(certificate instanceof Certificate, "Parameter must be instance of Certificate");

	var fn = this.getFilename(certificate._holder, certificate.serial, certificate.linkDir);
	return this.factory.deleteFile(fn);
}
