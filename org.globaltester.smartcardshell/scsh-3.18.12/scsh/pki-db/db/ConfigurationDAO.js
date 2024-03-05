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
 * @fileoverview DAO Factory for database based configuration persistence
 */

var Configuration = require('scsh/pki-db/Configuration').Configuration;



/**
 * Data access object for configurations
 *
 * @param {Object} the factory that created this DAO
 */
function ConfigurationDAO(factory) {
	GPSystem.log(GPSystem.DEBUG, module.id, "new()");

	this.factory = factory;
}

exports.ConfigurationDAO = ConfigurationDAO;



ConfigurationDAO.create =
"CREATE TABLE IF NOT EXISTS Configuration (" +
"	id MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT," +
"	name VARCHAR(250)," +
"	content LONGTEXT," +
"	PRIMARY KEY (id)" +
")";

ConfigurationDAO.drop = "DROP TABLE IF EXISTS Configuration";



ConfigurationDAO.prototype.toString = function() {
	return "ConfigurationDAO(db)";
}



/**
 * Create and persists a new configuration
 *
 * @type Configuration
 * @return the newly created configuration object
 */
ConfigurationDAO.prototype.newConfiguration = function(name, template) {
	GPSystem.log(GPSystem.DEBUG, module.id, "newConfiguration(" + name + ")");

	var sr = new Configuration(this, name, template);

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = this.factory.insertStatementFromObject(con, "Configuration", sr);

		stmt.executeUpdate();
		rs = stmt.getGeneratedKeys();
		rs.next();
		sr.id = rs.getInt(1);
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

	return sr;
}



/**
 * Get configuration identified by id
 *
 * @param {Number} id the id
 * @type Configuration
 * @return the configuration or null if not found
 */
ConfigurationDAO.prototype.getConfigurationById = function(id) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getConfigurationById(" + id + ")");

	assert(typeof(id) == "number", "Parameter id must be a Number");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Configuration where id = ?");
		stmt.setInt(1, id);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "id " + id + " not found");
			return null;
		}
		var configuration = new Configuration(this);
		this.factory.resultSetToProperties(rs, configuration);
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

	return configuration;
}



/**
 * Get configuration identified by name
 *
 * @param {String} name the name of the configuration
 * @type Configuration
 * @return the configuration or null if not found
 */
ConfigurationDAO.prototype.getConfigurationByName = function(name) {
	GPSystem.log(GPSystem.DEBUG, module.id, "getConfigurationByName(" + name + ")");

	assert(typeof(name) == "string", "Parameter name must be a String");

	var con = null;
	var stmt = null;
	var rs = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("select * from Configuration where name = ?");
		stmt.setString(1, name);

		rs = stmt.executeQuery();
		if (!rs.next()) {
			GPSystem.log(GPSystem.DEBUG, module.id, "name " + name + " not found");
			return null;
		}
		var configuration = new Configuration(this);
		this.factory.resultSetToProperties(rs, configuration);
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

	return configuration;
}



/**
 * Update the Configuration content
 *
 * @param {Configuration} configuration the configuration to update
 * @param {String} content the new content
 */
ConfigurationDAO.prototype.updateContent = function(configuration, content) {
	GPSystem.log(GPSystem.DEBUG, module.id, "updateContent(" + configuration + "," + content + ")");

	assert(configuration, "Parameter configuration must not be empty");
	assert(configuration instanceof Configuration, "Parameter must be instance of Configuration");
	assert(typeof(content) == "string", "Parameter val must be a String");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("update Configuration set content = ? where id = ?;");

		stmt.setString(1, content);
		stmt.setInt(2, configuration.id);
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

	configuration.content = content;
}



/**
 * Delete Configuration
 *
 * @param {Configuration} configuration the configuration to delete
 * @type boolean
 * @return true if deleted
 */
ConfigurationDAO.prototype.deleteConfiguration = function(configuration) {
	GPSystem.log(GPSystem.DEBUG, module.id, "deleteConfiguration(" + configuration + ")");

	assert(configuration, "Parameter configuration must not be empty");
	assert(configuration instanceof Configuration, "Parameter must be instance of Configuration");

	var con = null;
	var stmt = null;

	try	{
		con = this.factory.getConnection();

		stmt = con.prepareStatement("delete from Configuration where id = ?;");

		stmt.setInt(1, configuration.id);
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
