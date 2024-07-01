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

var Certificate = require('scsh/pki-db/Certificate').Certificate;
var Holder = require('scsh/pki-db/Holder').Holder;



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



CertificateDAO.create = [
"CREATE TABLE IF NOT EXISTS Certificate (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	holderId MEDIUMINT UNSIGNED NOT NULL REFERENCES Holder(id)," +
"	serviceRequestId MEDIUMINT UNSIGNED REFERENCES ServiceRequest(id)," +
"	expiry BIGINT," +
"	status SMALLINT NOT NULL DEFAULT 0," +
"	revocationDate TIMESTAMP NULL," +
"	invalidityDate TIMESTAMP NULL," +
"	serial VARCHAR(100) NOT NULL," +
"	linkDir SMALLINT NOT NULL," +
"	keyId VARBINARY(64)," +
"	bytes VARBINARY(8192) NOT NULL," +
"	PRIMARY KEY (id)," +
"	UNIQUE (holderId, serial, linkDir)," +
"	FOREIGN KEY (holderId) REFERENCES Holder(id) ON DELETE CASCADE" +
")",
{	H2: "CREATE INDEX IF NOT EXISTS Certificate_Idx1 ON Certificate(holderId, serial, linkDir);",
	MySQL: {
		IsEmpty: "SHOW INDEX FROM Certificate WHERE Key_name = 'Certificate_Idx1';",
		Statement: "ALTER TABLE Certificate ADD INDEX Certificate_Idx1 (holderId, serial, linkDir);"
	}},
{	H2: "CREATE INDEX IF NOT EXISTS Certificate_Idx2 ON Certificate(keyId);",
	MySQL: {
		IsEmpty: "SHOW INDEX FROM Certificate WHERE Key_name = 'Certificate_Idx2';",
		Statement: "ALTER TABLE Certificate ADD INDEX Certificate_Idx2 (keyId);"
	}}
];



CertificateDAO.drop = "DROP TABLE IF EXISTS Certificate";



CertificateDAO.prototype.toString = function() {
	return "CertificateDAO(db)";
}



/**
 * Create and persists a new certificate object
 *
 * For certificates the serial number is used as unique identifier, as the keyId can be re-used if more
 * than one certificate is issued for the same key.
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

	var certificate = new Certificate(this, holder, serial, dir, certbin, template);

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "Certificate", certificate);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		certificate.id = rs.getInt(1);
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return certificate;
}



/**
 * Get certificate identified by id
 *
 * @param {Number} id the certificate database id
 * @type Certificate
 * @return the certificate object or null if not found
 */
CertificateDAO.prototype.getCertificateById = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCertificateById(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be number");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Certificate where id = ?;");
		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No certificate with id " + id + " found");
			return null;
		}
		var certificate = new Certificate(this);
		this.factory.resultSetToProperties(rs, certificate);
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return certificate;
}



/**
 * Get certificate identified by serial number for given holder
 *
 * @param {Holder} holder the holder of this certificate
 * @param {String} serial the serial number of this certificate (full CHR for CVC and hexadecimal serial for X.509)
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

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Certificate where holderId = ? and serial = ? and linkDir = ?;");
		stmt.setInt(1, holder.id);
		stmt.setString(2, serial);
		stmt.setInt(3, dir);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			rs.close();

			if (dir == Certificate.SHORT) {
				stmt.close();
				con.close();
				GPSystem.log(GPSystem.DEBUG, module.id, "Root certificate " + serial + " not found");
				return null;
			}

			stmt.setInt(3, Certificate.SHORT);
			rs = stmt.executeQuery();
			if (!rs.next()) {
				rs.close();
				stmt.close();
				con.close();
				GPSystem.log(GPSystem.DEBUG, module.id, "No certificate with " + serial + " found");
				return null;
			}
		}
		var certificate = new Certificate(this, holder);
		this.factory.resultSetToProperties(rs, certificate);
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return certificate;
}



/**
 * Get certificate identified by serial number for a certain certificate type
 *
 * This method is used to locate the issuer of a CVC terminal certificate when building a chain to the root.
 * The method is not guaranteed to find a certificate, if multiple certificates of the same name exist in a PKI,
 * e.g. if two different DVCAs use the same terminal naming scheme.
 *
 * @param {String} serial the serial number of this certificate (full CHR for CVC and decimal serial for X.509)
 * @param {Number} certtype one of Holder.CVC(default) or Holder.X509. See Holder for explanation
 * @type Certificate
 * @return the certificate object or null if not found
 */
CertificateDAO.prototype.getCertificateBySerialAndType = function(serial, certtype) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCertificateBySerialAndType(" + certtype + "," + serial + ")");

	assert(serial, "Parameter serial must not be empty");
	assert(typeof(serial) == "string", "Parameter serial must be a String");

	if (!certtype) {
		certtype = Holder.CVC;
	}

	assert(((certtype & 0xF) == Holder.CVC) || ((certtype & 0xF) == Holder.X509), "Parameter certtype invalid");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Certificate join Holder on Certificate.holderId = Holder.id where Certificate.serial = ? and Holder.certificateType = ?;");

		stmt.setString(1, serial);
		stmt.setInt(2, certtype);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			rs.close();
			stmt.close();
			con.close();
			GPSystem.log(GPSystem.DEBUG, module.id, "No certificate found with serial " + serial);
			return null;
		}

		var certificate = new Certificate(this, { id: -1} );
		this.factory.resultSetToProperties(rs, certificate);

		if (rs.next()) {
			rs.close();
			stmt.close();
			con.close();
			GPSystem.log(GPSystem.DEBUG, module.id, "Multiple certificates found with serial " + serial);
			return null;
		}

	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return certificate;
}



/**
 * Get certificate identified by key id
 *
 * @param {Number} keyId the certificate database keyId
 * @type Certificate
 * @return the certificate object or null if not found
 */
CertificateDAO.prototype.getCertificateByKeyId = function(keyId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getCertificateByKeyId(" + keyId + ")");

	assert(keyId instanceof ByteString, "Parameter must be instance of ByteString");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Certificate where keyId = ?;");
		stmt.setBytes(1, keyId);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "No certificate with keyId " + keyId + " found");
			return null;
		}
		var certificate = new Certificate(this);
		this.factory.resultSetToProperties(rs, certificate);
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return certificate;
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

	if (!holder.certId) {
		return null;
	}

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Certificate where id = ?;");
		stmt.setInt(1, holder.certId);
		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "id " + holder.certId + " not found");
			return null;
		}
		var certificate = new Certificate(this, holder);
		this.factory.resultSetToProperties(rs, certificate);
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return certificate;
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

	var con = null;
	var stmt = null;
	var rs = null;
	var result = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Certificate where holderId = ?;");
		stmt.setInt(1, holder.id);
		rs = stmt.executeQuery();
		while (rs.next()) {
			var certificate = new Certificate(this, holder);
			this.factory.resultSetToProperties(rs, certificate);
			result.push(certificate);
		}
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return result;
}



/**
 * Get all certificates that were imported by the given service request id
 *
 * @param {Number} serviceRequestId the service request id
 * @type Certificate[]
 * @return the list of certificates, which my be empty
 */
CertificateDAO.prototype.enumerateCertificatesByServiceRequestId = function(serviceRequestId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "enumerateCertificatesByServiceRequestId(" + serviceRequestId + ")");

	assert(typeof(serviceRequestId) == "number", "Parameter serviceRequestId must be number");
	assert(serviceRequestId > 0, "Invalid argument value for serviceRequestId");

	var con = null;
	var stmt = null;
	var rs = null;
	var result = [];

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Certificate where serviceRequestId = ?;");
		stmt.setInt(1, serviceRequestId);
		rs = stmt.executeQuery();
		while (rs.next()) {
			var certificate = new Certificate(this);
			this.factory.resultSetToProperties(rs, certificate);
			result.push(certificate);
		}
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
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

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from Certificate where id = ?;");

		stmt.setInt(1, certificate.id);
		stmt.executeUpdate();
	}
	finally {
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}
	return true;
}



/**
 * Update revocation status
 *
 * @param {Number} certId the certificate id
 * @param {Number} status the status id
 * @type boolean
 * @return true if updated
 */
CertificateDAO.prototype.updateRevocationStatus = function(certId, status) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateRevocationStatus( certificateId=" + certId + " status=" + status + ")");

	assert(typeof(certId) == "number", "Parameter id must be number");
	assert(typeof(status) == "number", "Parameter status must be number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Certificate set status = ? where id = ?;");

		stmt.setInt(1, status);
		stmt.setInt(2, certId);
		var updated = stmt.executeUpdate();
	}
	finally {
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}
	return updated > 0;
}



/**
 * Update revocation date
 *
 * @param {Number} certId the certificate id
 * @param {Date/NULL} date the revocation date or null
 * @type boolean
 * @return true if updated
 */
CertificateDAO.prototype.updateRevocationDate = function(certId, date) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateRevocationDate( certificateId=" + certId + " date=" + date + ")");

	assert(typeof(certId) == "number", "Parameter id must be number");
	assert(date instanceof Date || date == null, "Parameter date must be an object of type Date or null");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		if (date == null) {
			stmt = con.prepareStatement("update Certificate set revocationDate = NULL where id = ?;");
			stmt.setInt(1, certId);
		} else {
			stmt = con.prepareStatement("update Certificate set revocationDate = ? where id = ?;");
			var ts = new java.sql.Timestamp(date.valueOf());
			stmt.setTimestamp(1, ts);
			stmt.setInt(2, certId);
		}

		var updated = stmt.executeUpdate();
	}
	finally {
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}
	return updated > 0;
}



/**
 * Update invalidity date
 *
 * @param {Number} certId the certificate id
 * @param {Date/NULL} date the invalidity date or null
 * @type boolean
 * @return true if updated
 */
CertificateDAO.prototype.updateInvalidityDate = function(certId, date) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateInvalidityDate( certificateId=" + certId + " date=" + date + ")");

	assert(typeof(certId) == "number", "Parameter id must be number");
	assert(date instanceof Date || date == null, "Parameter date must be an object of type Date or null");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		if (date == null) {
			stmt = con.prepareStatement("update Certificate set invalidityDate = NULL where id = ?;");
			stmt.setInt(1, certId);
		} else {
			stmt = con.prepareStatement("update Certificate set invalidityDate = ? where id = ?;");
			var ts = new java.sql.Timestamp(date.valueOf());
			stmt.setTimestamp(1, ts);
			stmt.setInt(2, certId);
		}

		var updated = stmt.executeUpdate();
	}
	finally {
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}
	return updated > 0;
}



/**
 * Update service request id
 *
 * @param {Number} certId the certificate id
 * @param {Number} srId the service request id
 * @type boolean
 * @return true if updated
 */
CertificateDAO.prototype.updateServiceRequestId = function(certId, srId) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateServiceRequestId( certificateId=" + certId + " srId=" + srId + ")");

	assert(typeof(certId) == "number", "Parameter id must be number");
	assert(typeof(srId) == "number", "Parameter srId must be number");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Certificate set serviceRequestId = ? where id = ?;");

		stmt.setInt(1, srId);
		stmt.setInt(2, certId);
		var updated = stmt.executeUpdate();
	}
	finally {
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}
	return updated > 0;
}



/**
 * Get all revoked certificates issued to the given holder
 *
 * @param {Number} parentHolderId the issuer's holder id
 * @param {Date} revocationDate the date to check the expiration date of the certificates
 * @type Certificate[]
 * @return the list of certificates, which my be empty
 */
CertificateDAO.prototype.getRevokedCertificates = function(parentHolderId, revocationDate) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getRevokedCertificates(" + parentHolderId + ", " + revocationDate + ")");

	assert(typeof(parentHolderId) == "number", "Parameter parentHolderId must be number");
	assert(revocationDate instanceof Date, "Parameter revocationDate must be an object of type Date or null");

	var con = null;
	var stmt = null;
	var rs = null;
	var result = [];

	try	{
		con = this.factory.getConnection();

		var sql = "select c.id, c.holderId, c.serviceRequestId, c.expiry, c.status, c.revocationDate, c.invalidityDate, c.serial, c.linkDir, c.keyId, c.bytes "
			+ "from Certificate c join Holder h on (c.holderId = h.id) "
			+ "where h.parentId = ? and c.status > 0 and c.expiry > ?;";

		stmt = con.prepareStatement(sql);
		stmt.setInt(1, parentHolderId);
		stmt.setLong(2, revocationDate.valueOf());
		rs = stmt.executeQuery();
		while (rs.next()) {
			var certificate = new Certificate(this);
			this.factory.resultSetToProperties(rs, certificate);
			result.push(certificate);
		}
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}

	return result;
}



/**
 * Update full table
 *
 * @param {Function} updatefunc the callback to receive the result set to be modified
 */
CertificateDAO.prototype.updateBatch = function(updatefunc) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateBatch()");

	assert(typeof(updatefunc) == "function", "Parameter updatefunc must be a function");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();
		stmt = con.createStatement(java.sql.ResultSet.TYPE_SCROLL_SENSITIVE, java.sql.ResultSet.CONCUR_UPDATABLE);
		rs = stmt.executeQuery("select * from Certificate;");

		while (rs.next()) {
			updatefunc(rs);
			rs.updateRow();
		}
	}
	finally {
		if (rs != null) {
			rs.close();
		}
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}
}
