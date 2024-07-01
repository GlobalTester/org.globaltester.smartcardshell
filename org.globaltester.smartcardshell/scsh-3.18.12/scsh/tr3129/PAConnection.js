/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2016 CardContact Software & System Consulting
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
 * @fileoverview Connector implementing a web service interface to a TCC for Passive Authentication as defined in TR-03129
 */



/**
 * Creates a web service connector to access services for Passive Authentication as defined in TR-03129
 *
 * @class Class implementing a TCC web service connector for PA
 * @constructor
 * @param {String} url the web service endpoint
 */
function PAConnection(url) {
	this.url = url;
	this.soapcon = new SOAPConnection(SOAPConnection.SOAP11);
	this.verbose = true;
	this.lastReturnCode = null;
	this.version = "1.1";
}

exports.PAConnection = PAConnection;



/**
 * Sets the version of the WSDL to use
 *
 * @param {String} version the version to use
 */
PAConnection.prototype.setVersion = function(version) {
	this.version = version;
}



/**
 * Get the last error return code (Deprecated: Use getLastReturnCode() instead)
 *
 * @returns the last error return code received or null if none defined
 * @type String
 */
PAConnection.prototype.getLastError = function() {
	return this.lastReturnCode;
}



/**
 * Get the last return code
 *
 * @returns the last return code received or null if none defined
 * @type String
 */
PAConnection.prototype.getLastReturnCode = function() {
	return this.lastReturnCode;
}



/**
 * Get the last DSInfo data structure
 *
 * @returns the last DSInfo received or null if none defined
 * @type Object
 */
PAConnection.prototype.getLastDSInfo = function() {
	return this.lastDSInfo;
}



/**
 * Get the last dsTrustStatus. Must be one of
 * certificate_ok
 * certificate_undetermined
 * certificate_invalid
 *
 * @returns the last dsTrustStatus received or null if none defined
 * @type String
 */
PAConnection.prototype.getLastDSTrustStatus = function() {
	var ns1 = new Namespace("uri:eacBT/" + this.version);
	if (!this.getLastDSInfo()) {
		return null;
	}
	return this.getLastDSInfo().ns1::dsTrustStatus.toString();
}



/**
 * Get the CSCA Certificate from the last GetDocumentSignerInformation call
 * or null if no CSCA Certificate was returned.
 *
 * @returns the CSCA Certificate or null if not defined
 * @type ByteString
 */
PAConnection.prototype.getLastCSCACertificate = function() {
	var ns1 = new Namespace("uri:eacBT/" + this.version);

	if (!this.getLastDSInfo()) {
		return null;
	}

	var cert =  this.getLastDSInfo().ns1::cscaCertificate.ns1::certificate;
	if (cert.length() == 0) {
		return null;
	}

	return new ByteString(cert, BASE64);
}



/**
 * Get the last Document Signer validity status
 *
 * @returns the DS validity status or null if not defined
 * @type String
 */
PAConnection.prototype.getLastDSValidityStatus = function() {
	var ns1 = new Namespace("uri:eacBT/" + this.version);

	if (!this.getLastDSInfo()) {
		return null;
	}

	var status = this.getLastDSInfo().ns1::certValidity.ns1::dsValidity.ns1::status;
	return status.toString();
}



/**
 * Get the last CSCA validity status
 *
 * @returns the CSCA validity status or null if not defined
 * @type String
 */
PAConnection.prototype.getLastCSCAValidityStatus = function() {
	var ns1 = new Namespace("uri:eacBT/" + this.version);

	if (!this.getLastDSInfo()) {
		return null;
	}

	var status = this.getLastDSInfo().ns1::certValidity.ns1::cscaValidity.ns1::status;
	return status.toString();
}



/**
 * Get the last Document Signer signature status
 *
 * @returns the DS signature status or null if not defined
 * @type String
 */
PAConnection.prototype.getLastDSSignatureStatus = function() {
	var ns1 = new Namespace("uri:eacBT/" + this.version);

	if (!this.getLastDSInfo()) {
		return null;
	}

	var status = this.getLastDSInfo().ns1::dsSignature.ns1::status;
	return status.toString();
}



/**
 * Gets the last request
 *
 * @returns the last request
 * @type XML
 */
PAConnection.prototype.getLastRequest = function() {
	return this.request;
}



/**
 * Gets the last response
 *
 * @returns the last response
 * @type XML
 */
PAConnection.prototype.getLastResponse = function() {
	return this.response;
}



/**
 * Close the connector and release allocated resources
 */
PAConnection.prototype.close = function() {
	this.soapcon.close();
}



/**
 * Send a Document Signer Certificate to the TCC for validation
 *
 * @param {X509} cert the Document Signer Certificate
 * @param {Boolean} returnCSCACert if true receive the corresponding CSCA Certificate. Default is false.
 * @returns true if Document Signer Certificate is valid, false otherwise
 * @type Boolean
 */
PAConnection.prototype.GetDocumentSignerInformation = function(cert, returnCSCACert) {

	this.lastReturnCode = null;

	var ns = new Namespace("uri:EAC-PKI-IS-Reader-Protocol/" + this.version);
	var ns1 = new Namespace("uri:eacBT/" + this.version);

	if (!returnCSCACert) {
		returnCSCACert = false;
	}

	var request =
		<ns:GetDocumentSignerInformation xmlns:ns={ns} xmlns:ns1={ns1}>
			<dsCertificate>
				<!--Optional:-->
				<ns1:binary>{cert.getBytes().toString(BASE64)}</ns1:binary>
			</dsCertificate>
			<SignerIdentifier>
				<!--Optional:-->
			</SignerIdentifier>
			<returnCSCACertificate>{returnCSCACert}</returnCSCACertificate>
		</ns:GetDocumentSignerInformation>;

	if (this.verbose) {
		GPSystem.log(GPSystem.INFO, module.id, request.toXMLString());
	}

	this.request = request;

	try {
		var response = this.soapcon.call(this.url, request);
		if (this.verbose) {
			GPSystem.log(GPSystem.INFO, module.id, response.toXMLString());
		}
	}
	catch(e) {
		GPSystem.log(GPSystem.ERROR, module.id, "SOAP call to " + this.url + " failed : " + e);
		throw new GPError("PAConnection", GPError.DEVICE_ERROR, 0, "GetDocumentSignerInformation failed with : " + e.message);
	}

	this.response = response;
	this.lastReturnCode = response.Result.ns1::returnCode.toString();
	this.lastDSInfo = response.Result.ns1::dsInfo;

	return (this.lastReturnCode.equals("ok_syntax") && this.getLastDSTrustStatus().equals("certificate_ok"));
}



/**
 * Get the current Master List
 *
 * @returns the current Master List
 * @type ByteString
 */
PAConnection.prototype.GetMasterList = function() {

	this.lastReturnCode = null;

	var ns = new Namespace("uri:EAC-PKI-IS-Reader-Protocol/" + this.version);
	var ns1 = new Namespace("uri:eacBT/" + this.version);

	var request = <ns:GetMasterList xmlns:ns={ns}/>;

	if (this.verbose) {
		GPSystem.log(GPSystem.INFO, module.id, request.toXMLString());
	}

	this.request = request;

	try {
		var response = this.soapcon.call(this.url, request);
		if (this.verbose) {
			GPSystem.log(GPSystem.INFO, module.id, response.toXMLString());
		}
	}
	catch(e) {
		GPSystem.log(GPSystem.ERROR, module.id, "SOAP call to " + this.url + " failed : " + e);
		throw new GPError("PAConnection", GPError.DEVICE_ERROR, 0, "GetDocumentSignerInformation failed with : " + e.message);
	}

	this.response = response;
	this.lastReturnCode = response.Result.ns1::returnCode.toString();

	if (this.lastReturnCode == "ok_list_available") {
		var masterList = response.Result.ns1::masterList.ns1::binary;
		return new ByteString(masterList, BASE64);;
	} else {
		return null;
	}
}