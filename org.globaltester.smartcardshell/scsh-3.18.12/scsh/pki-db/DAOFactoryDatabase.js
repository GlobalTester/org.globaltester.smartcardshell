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
 * @fileoverview DAO Factory for database persistence
 */


var HolderDAO = require('scsh/pki-db/db/HolderDAO').HolderDAO;
var SignerDAO = require('scsh/pki-db/db/SignerDAO').SignerDAO;
var RequestDAO = require('scsh/pki-db/db/RequestDAO').RequestDAO;
var CertificateDAO = require('scsh/pki-db/db/CertificateDAO').CertificateDAO;
var ServiceRequestDAO = require('scsh/pki-db/db/ServiceRequestDAO').ServiceRequestDAO;
var ConfigurationDAO = require('scsh/pki-db/db/ConfigurationDAO').ConfigurationDAO;
var TokenDAO = require('scsh/pki-db/db/TokenDAO').TokenDAO;
var SubjectDAO = require('scsh/pki-db/db/SubjectDAO').SubjectDAO;
var RoleDAO = require('scsh/pki-db/db/RoleDAO').RoleDAO;
var LongDate = require('scsh/pki-db/LongDate').LongDate;



/**
 * A factory that can create data access objects for the PKI database
 *
 * @param {String} path the root directory for the file system structure
 */
function DAOFactoryDatabase(type, url, user, password) {
	this.type = type;
	switch(type) {
		case "MySQL":
			url += "?zeroDateTimeBehavior=convertToNull";
// 			url += "&logger=com.mysql.jdbc.log.Slf4JLogger&profileSQL=true"; // Enable logging
			this.ds = new Packages.org.mariadb.jdbc.MariaDbDataSource(url);
			this.ds.setUser(user);
			this.ds.setPassword(password);
			break;
		case "H2":
			url += ";DATABASE_TO_UPPER=FALSE";
			this.ds = Packages.org.h2.jdbcx.JdbcConnectionPool.create(url, user, password);
			break;
		default:
			throw new GPError(module.id, GPError.INVALID_DATA, 0, "Unknown database type " + type);
	}
	this.url = url;
}

exports.DAOFactoryDatabase = DAOFactoryDatabase;

DAOFactoryDatabase.INT		= java.sql.Types.INTEGER;
DAOFactoryDatabase.SMALLINT	= java.sql.Types.SMALLINT;
DAOFactoryDatabase.BIGINT	= java.sql.Types.BIGINT;
DAOFactoryDatabase.VARCHAR	= java.sql.Types.VARCHAR;
DAOFactoryDatabase.VARBINARY	= java.sql.Types.VARBINARY;
DAOFactoryDatabase.BLOB		= java.sql.Types.BLOB;
DAOFactoryDatabase.CLOB		= java.sql.Types.CLOB;
DAOFactoryDatabase.MEDIUMBLOB	= java.sql.Types.LONGVARBINARY;
DAOFactoryDatabase.TIMESTAMP	= java.sql.Types.TIMESTAMP;



DAOFactoryDatabase.prototype.toString = function() {
	return "DBDAO(" + this.type + ")";
}



DAOFactoryDatabase.prototype.getHolderDAO = function() {
	if (typeof(this.holderDAO) == "undefined") {
		this.holderDAO = new HolderDAO(this);
	}
	return this.holderDAO;
}



DAOFactoryDatabase.prototype.getCertificateDAO = function() {
	if (typeof(this.certificateDAO) == "undefined") {
		this.certificateDAO = new CertificateDAO(this);
	}
	return this.certificateDAO;
}



DAOFactoryDatabase.prototype.getSignerDAO = function() {
	if (typeof(this.signerDAO) == "undefined") {
		this.signerDAO = new SignerDAO(this);
	}
	return this.signerDAO;
}



DAOFactoryDatabase.prototype.getRequestDAO = function() {
	if (typeof(this.requestDAO) == "undefined") {
		this.requestDAO = new RequestDAO(this);
	}
	return this.requestDAO;
}



DAOFactoryDatabase.prototype.getServiceRequestDAO = function() {
	if (typeof(this.serviceRequestDAO) == "undefined") {
		this.serviceRequestDAO = new ServiceRequestDAO(this);
	}
	return this.serviceRequestDAO;
}



DAOFactoryDatabase.prototype.getConfigurationDAO = function() {
	if (typeof(this.configurationDAO) == "undefined") {
		this.configurationDAO = new ConfigurationDAO(this);
	}
	return this.configurationDAO;
}



DAOFactoryDatabase.prototype.getTokenDAO = function() {
	if (typeof(this.tokenDAO) == "undefined") {
		this.tokenDAO = new TokenDAO(this);
	}
	return this.tokenDAO;
}



DAOFactoryDatabase.prototype.getSubjectDAO = function() {
	if (typeof(this.subjectDAO) == "undefined") {
		this.subjectDAO = new SubjectDAO(this);
	}
	return this.subjectDAO;
}



DAOFactoryDatabase.prototype.getRoleDAO = function() {
	if (typeof(this.roleDAO) == "undefined") {
		this.roleDAO = new RoleDAO(this);
	}
	return this.roleDAO;
}



DAOFactoryDatabase.prototype.getConnection = function() {
	return this.ds.getConnection();
}



DAOFactoryDatabase.prototype.executeScript = function(stmt, script) {
	if (typeof(script) == "string") {
		script = [ script ];
	}
	for (var i = 0; i < script.length; i++) {
		var s = script[i];

		if (s instanceof Object) {
			s = s[this.type];

			if (s instanceof Object) {
				cs = s.IsEmpty;

				var rs = stmt.executeQuery(cs);
				if (rs.next()) {
					rs.close();
					continue;
				}
				rs.close();

				s = s.Statement;
			}
		}
		if (s) {
			stmt.executeUpdate(s);
		}
	}
}



DAOFactoryDatabase.prototype.createTables = function() {
	var con = null;
	var stmt = null;

	try	{
		con = this.getConnection();

		stmt = con.createStatement();
		this.executeScript(stmt, RoleDAO.createRole);
		this.executeScript(stmt, SubjectDAO.create);
		this.executeScript(stmt, HolderDAO.create);
		this.executeScript(stmt, SignerDAO.create);
		this.executeScript(stmt, RequestDAO.create);
		this.executeScript(stmt, ServiceRequestDAO.create);
		this.executeScript(stmt, SubjectDAO.addForeignKey);
		this.executeScript(stmt, RoleDAO.createAssignedRole);
		this.executeScript(stmt, CertificateDAO.create);
		this.executeScript(stmt, ConfigurationDAO.create);
		this.executeScript(stmt, TokenDAO.create);
	}
	finally {
		if (stmt != null) {
			stmt.close();
		}
		if (con != null) {
			con.close();
		}
	}
}



DAOFactoryDatabase.prototype.dropTables = function() {
	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.getConnection();

		stmt = con.createStatement();
		this.executeScript(stmt, TokenDAO.drop);
		this.executeScript(stmt, ConfigurationDAO.drop);
		this.executeScript(stmt, CertificateDAO.drop);
		this.executeScript(stmt, SubjectDAO.dropForeignKey);
		this.executeScript(stmt, ServiceRequestDAO.drop);
		this.executeScript(stmt, RequestDAO.drop);
		this.executeScript(stmt, SignerDAO.drop);
		this.executeScript(stmt, HolderDAO.drop);
		this.executeScript(stmt, RoleDAO.dropAssignedRole);
		this.executeScript(stmt, SubjectDAO.drop);
		this.executeScript(stmt, RoleDAO.dropRole);
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



/**
 * Change encoding of serial field from decimal to hexadecimal
 */
DAOFactoryDatabase.updateCertificateSerial = function(rs) {
	var bytes = rs.getBytes("bytes");
	var x = new X509(bytes);
	var newserial = x.getSerialNumber().toString(HEX);
	var oldserial = rs.getString("serial");
	GPSystem.log(GPSystem.INFO, module.id, "From serial " + oldserial + " to " + newserial);
	rs.updateString("serial", newserial);
}



DAOFactoryDatabase.prototype.updateTables = function(version) {
	switch(version) {
		case 3:
			GPSystem.log(GPSystem.INFO, module.id, "Update database to version 0.3");
			var dao = this.getCertificateDAO();
			dao.updateBatch(DAOFactoryDatabase.updateCertificateSerial);
		break;
	}
}



/**
 * Iternate result set and fill properties in object with matching data types
 *
 * The method map SQL type to SCSH types, namely (string, int and ByteString)
 *
 * @param {ResultSet} rs the result set returned from a database query
 * @param {Object} obj the object into which the columns shall be injected
 */
DAOFactoryDatabase.prototype.resultSetToProperties = function(rs, obj) {
	var meta = rs.getMetaData();

	var l = meta.getColumnCount();
	for (var i = 1; i <= l; i++) {
		var propname = meta.getColumnName(i);
		var type = meta.getColumnType(i)
// 		print("propname " + propname);
// 		print(" type: " + type);
// 		print(" getColumnTypeName " + meta.getColumnTypeName(i));

		switch(type) {
			case DAOFactoryDatabase.INT:
			case DAOFactoryDatabase.SMALLINT:
				var v = rs.getInt(i);
				if (!rs.wasNull()) {
					obj[propname] = v;
				}
				break;
			case DAOFactoryDatabase.BIGINT:
				var v = rs.getLong(i);
				if (!rs.wasNull()) {
					obj[propname] = v;
				}
				break;
			case DAOFactoryDatabase.CLOB:
			case DAOFactoryDatabase.VARCHAR:
				var v = rs.getString(i);
				if (!rs.wasNull()) {
					obj[propname] = v;
				}
				break;
			case DAOFactoryDatabase.VARBINARY:
			case DAOFactoryDatabase.BLOB:
			case DAOFactoryDatabase.MEDIUMBLOB:
				var v = rs.getBytes(i);
				if (!rs.wasNull()) {
					obj[propname] = v;
				}
				break;
			case DAOFactoryDatabase.TIMESTAMP:
				var v = rs.getTimestamp(i);
				if (!rs.wasNull()) {
					obj[propname] = new Date(v.getTime());
				}
				break;
			default:
				if (meta.getColumnTypeName(i) == "VARCHAR") {
					// Columns of type [LONG]TEXT have no equivalent java.sql.Type
					var v = rs.getString(i);
					if (!rs.wasNull()) {
						obj[propname] = v;
					}
				} else {
					throw new GPError(module.id, GPError.INVALID_DATA, i, "Unknown type " + type + ":" + meta.getColumnTypeName(i));
				}
		}
	}
}



/**
 * Create a SQL insert statement from the given object with the list of properties
 *
 * If the list of elements is not defined, then the method will create a list of properties
 * that do not start with "_" or a function properties. Properties with the name id, dao or holder
 * are ignored as well.
 *
 * @param {java.sql.Connection} con the SQL connection
 * @param {String} table the table name
 * @param {Object} obj the property object
 * @param {String[]} el the list of elements to insert
 */
DAOFactoryDatabase.prototype.insertStatementFromObject = function(con, table, obj, el) {

	if (!el) {
		var el = [];
		for (var i in obj) {
			if ((i.charAt(0) != "_") && (i != "id") && (i != "dao") && (i != "holder") && typeof(obj[i]) != "function") {
				el.push(i);
			}
		}
	}

	var vl = "";
	for (var i = 0; i < el.length; i++) {
		if (vl.length) {
			vl += ",?";
		} else {
			vl += "?";
		}
	}

	var str = "insert into " + table + " (" + el + ") values (" + vl + ");";

	GPSystem.log(GPSystem.DEBUG, module.id, str);

	stmt = con.prepareStatement(str, java.sql.Statement.RETURN_GENERATED_KEYS);

	for (var i = 1; i <= el.length; i++) {
		var e = obj[el[i - 1]];

		if (typeof(e) == "string") {
			stmt.setString(i, e);
		} else if (typeof(e) == "number") {
			stmt.setInt(i, e);
		} else if (e instanceof ByteString) {
			stmt.setBytes(i, e);
		} else if (e instanceof Date) {
			var ts = new java.sql.Timestamp(e.valueOf());
			stmt.setTimestamp(i, ts);
		} else if (e instanceof LongDate) {
			stmt.setLong(i, e.date.valueOf());
		} else {
			throw new GPError(module.id, GPError.INVALID_DATA, i, "Unsupported property " + el[i - 1] + " with type " + typeof(e) + " and value " + e);
		}
	}
	return stmt;
}



/**
 * Create a SQL select statement from a filter
 *
 * @param {java.sql.Connection} con the SQL connection
 * @param {String} table the table name
 * @param {Object} filter an object whose properties define the columns and values to match
 * @param {String[]} columnNames the list of column names to return (undefined for *)
 * @param {Number} offset the offset into the result set (optional)
 * @param {Number} page the maximum number of records (optional)
 */
DAOFactoryDatabase.prototype.selectStatementFromFilter = function(con, table, filter, columnNames, offset, page) {
	var filstr = "";
	var logicalOp = "and";
	for (var i in filter) {
		var compOp = "=";
		if (typeof(filter[i]) == 'object') {
			compOp = filter[i].compOp;
		}
		if (filstr) {
			filstr += " and ";
		}
		if (compOp.equals("like")) {
			filstr += "LOWER( " + i + " ) " + compOp +" ?";
		} else if (filter[i] != null) {
			filstr += i + " " + compOp +" ?";
		} else {
			filstr += i + " is null";
		}
	}

	var colstr = "*";
	if (columnNames) {
		colstr = columnNames.toString();
	}

	var str = "select " + colstr + " from " + table;

	if (filstr) {
		str += " where " + filstr;
	}

	if (page) {
		str += " limit ?,?";
	}

	var stmt = con.prepareStatement(str);

	var c = 1;
	for (var i in filter) {
		var e = filter[i];

		if (e != null) {
			if (typeof(e) == "string") {
				stmt.setString(c, e);
			} else if (typeof(e) == "number") {
				stmt.setInt(c, e);
			} else if (e instanceof ByteString) {
				stmt.setBytes(c, e);
			} else if (typeof(filter[i] == 'object')) {
				stmt.setString(c, filter[i].value);
			} else {
				throw new GPError(module.id, GPError.INVALID_DATA, c, "Unsupported property " + i + " with type " + typeof(e) + " and value " + e);
			}
			c++;
		}
	}

	if (page) {
		stmt.setInt(c++, offset);
		stmt.setInt(c++, page);
	}

	return stmt;
}



/**
 * Where clause from filter
 *
 * @param {Object} filter an object whose properties define the columns and values to match
 * @type String
 * @return the where clause based on the filter
 */
DAOFactoryDatabase.prototype.whereClauseFromFilter = function(filter, logicalOp) {
	GPSystem.log(GPSystem.DEBUG, module.id, "whereClauseFromFilter(" + logicalOp + ")");

	var filstr = "";

	if (!logicalOp) {
		logicalOp = "and";
	}

	for (var i in filter) {
		var compOp = "=";

		if (typeof(filter[i]) == 'object') {
			if (filter[i].logicalOp) {
				if (filstr) {
					filstr += " " + logicalOp;
				}
				filstr += " (" + this.whereClauseFromFilter(filter[i].value, filter[i].logicalOp) + ")";
				continue;
			} else {
				compOp = filter[i].compOp;
			}
		}

		if (filstr) {
			filstr += " " + logicalOp + " ";
		}

		if (compOp.equals("like")) {
			filstr += "LOWER( " + i + " ) " + compOp +" ?";
		} else if (filter[i] != null) {
			filstr += i + " " + compOp +" ?";
		} else {
			filstr += i + " is null";
		}
	}

	return filstr;
}



/**
 * Set arguments in where statement from filter
 *
 * @param {java.sql.Statement} stmt the SQL statement containing the where clause created with whereClauseFromFilter().
 * @param {Number} offset the offset in the argument list
 * @param {Object} filter an object whose properties define the columns and values to match
 * @type Number
 * @return the next offset in the argument list
 */
DAOFactoryDatabase.prototype.setArgumentsFromFilter = function(stmt, offset, filter, pageStart, pageEnd) {
	GPSystem.log(GPSystem.DEBUG, module.id, "setArgumentsFromFilter(" + offset + "," + pageStart + "," + pageEnd + ")");

	for (var i in filter) {
		var e = filter[i];
		GPSystem.log(GPSystem.DEBUG, module.id, "### argument " + e);

		if (e != null) {
			if (typeof(e) == "string") {
				stmt.setString(offset++, e);
			} else if (typeof(e) == "number") {
				stmt.setInt(offset++, e);
			} else if (e instanceof ByteString) {
				stmt.setBytes(offset++, e);
			} else if (typeof(filter[i] == 'object')) {
				if (filter[i].logicalOp) {
					offset = this.setArgumentsFromFilter(stmt, offset, filter[i].value);
				} else {
					GPSystem.log(GPSystem.DEBUG, module.id, "Set argument from object " + filter[i].value + " at offset " + offset);
					stmt.setString(offset++, filter[i].value);
				}
			} else {
				throw new GPError(module.id, GPError.INVALID_DATA, offset, "Unsupported property " + i + " with type " + typeof(e) + " and value " + e);
			}
		}
	}

	if (pageEnd) {
		stmt.setInt(offset++, pageStart);
		stmt.setInt(offset++, pageEnd);
	}

	return offset;
}
