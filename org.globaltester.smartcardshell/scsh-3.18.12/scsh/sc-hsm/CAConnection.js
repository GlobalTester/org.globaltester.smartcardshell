/**
 *  ---------
 * |.##> <##.|  SmartCard-HSM Support Scripts
 * |#       #|
 * |#       #|  Copyright (c) 2016 CardContact Systems GmbH
 * |'##> <##'|  32429 Minden, Germany (www.cardcontact.de)
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
 * @fileoverview Online-CA Connection
 */



/**
 * Creates a web service connector to access an online CA
 *
 * @class Class implementing a CA web service connector
 * @constructor
 * @param {String} url the web service endpoint
 */
function CAConnection(url) {
	this.url = url;
	this.soapcon = new SOAPConnection();
	this.verbose = true;
	this.lastReturnCode = null;
}

exports.CAConnection = CAConnection;


/**
 * Get the last return code
 *
 * @returns the last return code received or null if none defined
 * @type String
 */
CAConnection.prototype.getLastReturnCode = function() {
	return this.lastReturnCode;
}



/**
 * Gets the last request
 *
 * @returns the last request
 * @type XML
 */
CAConnection.prototype.getLastRequest = function() {
	return this.request;
}



/**
 * Gets the last response
 *
 * @returns the last response
 * @type XML
 */
CAConnection.prototype.getLastResponse = function() {
	return this.response;
}



/**
 * Close the connector and release allocated resources
 */
CAConnection.prototype.close = function() {
	this.soapcon.close();
}



/**
 * Request a certificate from the CA using a web service
 *
 * @param {ByteString} certreq the certificate request
 * @param {String} messageID the messageID for asynchronous requests (optional)
 * @param {String} responseURL the URL to which the asynchronous response is send (optional)
 * @returns the new certificates
 * @type ByteString[]
 */
CAConnection.prototype.requestCertificate = function(certreq, devicecert, commonName, eMailAddress, activationCode) {

	this.lastReturnCode = null;

	var soapConnection = new SOAPConnection();

	var ns = new Namespace("http://www.openscdp.org/CAService");

	var request =
		<ns:RequestCertificate xmlns:ns={ns}>
			<CertificateSigningRequest>{certreq.toString(BASE64)}</CertificateSigningRequest>
			<DeviceCertificate>{devicecert.toString(BASE64)}</DeviceCertificate>
			<CommonName>{commonName}</CommonName>
			<eMailAddress>{eMailAddress}</eMailAddress>
		</ns:RequestCertificate>

	if (activationCode) {
		request.eMailAddress += <ActivationCode>{activationCode}</ActivationCode>;
	}

	if (this.verbose) {
		GPSystem.trace(request.toXMLString());
	}

	this.request = request;

	try	{
		var response = this.soapcon.call(this.url, request);
		if (this.verbose) {
			GPSystem.trace(response.toXMLString());
		}
	}
	catch(e) {
		GPSystem.trace("SOAP call to " + this.url + " failed : " + e);
		throw new GPError("CAConnection", GPError.DEVICE_ERROR, 0, "RequestCertificate failed with : " + e);
	}

	this.response = response;

	var certlist = [];

	this.lastReturnCode = response.ReturnCode.toString();

	if (this.lastReturnCode != "ok") {
		return null;
	}

	GPSystem.trace("Received certificates:");
	for each (var c in response.Certificates.Certificate) {
		var cert = new ByteString(c, BASE64);
		certlist.push(cert);
		GPSystem.trace(cert);
	}

	return certlist;
}
