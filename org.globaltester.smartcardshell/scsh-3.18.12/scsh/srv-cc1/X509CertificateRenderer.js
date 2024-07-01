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
 * @fileoverview Renderer for X509 certificates
 */

var File = require('scsh/file/File').File;

/**
 * A renderer which represents X509 certificates as HTML tables
 */
function X509CertificateRenderer() {

}
exports.X509CertificateRenderer = X509CertificateRenderer;

X509CertificateRenderer.SUBJECT_KEY_IDENTIFIER_OID = new ByteString("2.5.29.14", OID);
X509CertificateRenderer.KEY_USAGE_OID = new ByteString("2.5.29.15", OID);
X509CertificateRenderer.PRIVATE_KEY_USAGE_PERIOD_OID = new ByteString("2.5.29.16", OID);
X509CertificateRenderer.SUBJECT_ALTERNATIVE_NAME_OID = new ByteString("2.5.29.17", OID);
X509CertificateRenderer.ISSUER_ALTERNATIVE_NAME_OID = new ByteString("2.5.29.18", OID);
X509CertificateRenderer.BASIC_CONSTRAINTS_OID = new ByteString("2.5.29.19", OID);
X509CertificateRenderer.NAME_CONSTRAINTS_OID = new ByteString("2.5.29.30", OID);
X509CertificateRenderer.CRL_DISTRIBUTION_POINTS_OID = new ByteString("2.5.29.31", OID);
X509CertificateRenderer.CERTIFICATE_POLICIES = new ByteString("2.5.29.32", OID);
X509CertificateRenderer.POLICY_MAPPINGS_OID = new ByteString("2.5.29.33", OID);
X509CertificateRenderer.AUTHORITY_KEY_IDENTIFIER_OID = new ByteString("2.5.29.35", OID);
X509CertificateRenderer.POLICY_CONTRAINTS_OID = new ByteString("2.5.29.36", OID);
X509CertificateRenderer.EXT_KEY_USAGE_OID = new ByteString("2.5.29.37", OID);
X509CertificateRenderer.CA_INFORMATION_ACCESS_OID = new ByteString("1.3.6.1.5.5.7.1.1", OID);

X509CertificateRenderer.KEY_USAGE = ["digitalSignature", "nonRepudiation", "keyEncipherment", "dataEncipherment", "keyAgreement", "keyCertSign", "cRLSign", "encipherOnly", "decipherOnly"];
X509CertificateRenderer.KEY_USAGE.DIGITAL_SIGNATURE = 0x00;
X509CertificateRenderer.KEY_USAGE.NON_REPUDIATION = 0x01;
X509CertificateRenderer.KEY_USAGE.KEY_ENCIPHERMENT = 0x02;
X509CertificateRenderer.KEY_USAGE.DATA_ENCIPHERMENT= 0x03;
X509CertificateRenderer.KEY_USAGE.KEY_AGREEMENT= 0x04;
X509CertificateRenderer.KEY_USAGE.KEY_CERT_SIGN= 0x05;
X509CertificateRenderer.KEY_USAGE.CRL_SIGN= 0x06;
X509CertificateRenderer.KEY_USAGE.ENCIPHER_ONLY= 0x07;
X509CertificateRenderer.KEY_USAGE.DECIPHER_ONLY= 0x08;

X509CertificateRenderer.EXT_KEY_USAGE_SERVER_AUTHENTICATION_OID = new ByteString("1.3.6.1.5.5.7.3.1", OID);
X509CertificateRenderer.EXT_KEY_USAGE_CLIENT_AUTHENTICATION_OID = new ByteString("1.3.6.1.5.5.7.3.2", OID);
X509CertificateRenderer.EXT_KEY_USAGE_CODE_SIGNING_OID = new ByteString("1.3.6.1.5.5.7.3.3", OID);
X509CertificateRenderer.EXT_KEY_USAGE_EMAIL_OID = new ByteString("1.3.6.1.5.5.7.3.4", OID);
X509CertificateRenderer.EXT_KEY_USAGE_TIMESTAMPING_OID = new ByteString("1.3.6.1.5.5.7.3.8", OID);
X509CertificateRenderer.EXT_KEY_USAGE_OCSP_SIGNING_OID = new ByteString("1.3.6.1.5.5.7.3.9", OID);



/**
 * Render the certificate's extensions
 * and append it to the HTML table contained in
 * the given div element
 *
 * @param{X509} cert
 * @param{XML} div containing the HTML table representation of the certificate
 * @returns  a HTML div element containing the certificate representation
 * @type XML
 */
X509CertificateRenderer.prototype.renderExtensions = function (cert, div) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var native = cert.getNative();
	var critOIDs = native.getCriticalExtensionOIDs();
	var nonCritOIDs = native.getNonCriticalExtensionOIDs();

	div.appendChild(<h2>Critical Extensions</h2>);
	var critTable = <table class="content" style="word-wrap: break-word;"/>
	critTable.appendChild(
			<colgroup>
				<col width="20"/>
				<col width="80"/>
			</colgroup>);
	var critIterator = critOIDs.iterator();
	while (critIterator.hasNext()) {
		var oid = critIterator.next();
		var oidByteString = new ByteString(oid, OID);
		var r = this.createExtensionTableRow(oidByteString, cert);

		critTable.appendChild(r);
	}
	div.appendChild(critTable);


	div.appendChild(<h2>Non-Critical Extensions</h2>);
	var nonCritTable = <table class="content" style="word-wrap: break-word;"/>
	nonCritTable.appendChild(
			<colgroup>
				<col width="20"/>
				<col width="80"/>
			</colgroup>);
	var nonCritIterator = nonCritOIDs.iterator();
	while (nonCritIterator.hasNext()) {
		var oid = nonCritIterator.next();
		var oidByteString = new ByteString(oid, OID);
		var r = this.createExtensionTableRow(oidByteString, cert);

		nonCritTable.appendChild(r);
	}
	div.appendChild(nonCritTable);

	return div;
}



/**
 * Create a HTML table row containing the decoded name and value
 * for a specific certificate extension.
 *
 * @param{ByteString} oid the extension specified by the oid
 * @param{X509} cert
 * @returns  HTML table row
 * @type XML
 */
X509CertificateRenderer.prototype.createExtensionTableRow = function(oid, cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	if (oid.equals(X509CertificateRenderer.KEY_USAGE_OID)) {
		var value = this.createKeyUsageTable(cert);
	} else if (oid.equals(X509CertificateRenderer.EXT_KEY_USAGE_OID)) {
		var value = this.createExtendedKeyUsageTable(cert);
	} else if (oid.equals(X509CertificateRenderer.BASIC_CONSTRAINTS_OID)) {
		var value = this.createBasicConstraintsTable(cert);
	} else if (oid.equals(X509CertificateRenderer.CRL_DISTRIBUTION_POINTS_OID)) {
		var value = this.createCRLDistributionPointsTable(cert);
	} else if (oid.equals(X509CertificateRenderer.CA_INFORMATION_ACCESS_OID)) {
		var value = this.createAuthorityInformationAccessTable(cert);
	} else if (oid.equals(X509CertificateRenderer.CERTIFICATE_POLICIES)) {
		var value = this.createCertificatePoliciesTable(cert);
	} else if (oid.equals(X509CertificateRenderer.PRIVATE_KEY_USAGE_PERIOD_OID)) {
		var value = this.createPrivateKeyUsagePeriodTable(cert);
	} else {
		var native = cert.getNative();
		var value = native.getExtensionValue(oid.toString(OID));
	}

	var r =
		<tr>
			<th>{this.getExtensionName(oid)}</th>
			<td>{value}</td>
		</tr>;

	return r
}



/**
 * Get the corresponding extension name for a given OID
 *
 * @param{ByteString} oid the object identifier
 * @returns  the extension name
 * @type String
 */
X509CertificateRenderer.prototype.getExtensionName = function (oid) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	if (oid.equals(X509CertificateRenderer.SUBJECT_KEY_IDENTIFIER_OID)) {
		return "Subject Key Identifier";
	} else if (oid.equals(X509CertificateRenderer.KEY_USAGE_OID)) {
		return "Key Usage";
	} else if (oid.equals(X509CertificateRenderer.PRIVATE_KEY_USAGE_PERIOD_OID)) {
		return "Private Key Usage Period";
	} else if (oid.equals(X509CertificateRenderer.SUBJECT_ALTERNATIVE_NAME_OID)) {
		return "Subject Alternative Name";
	} else if (oid.equals(X509CertificateRenderer.ISSUER_ALTERNATIVE_NAME_OID)) {
		return "Issuer Alternative Name";
	} else if (oid.equals(X509CertificateRenderer.BASIC_CONSTRAINTS_OID)) {
		return "Basic Constraints";
	} else if (oid.equals(X509CertificateRenderer.NAME_CONSTRAINTS_OID)) {
		return "Name Constraints";
	} else if (oid.equals(X509CertificateRenderer.CRL_DISTRIBUTION_POINTS_OID)) {
		return "Certificate Revocation List Distribution Points";
	} else if (oid.equals(X509CertificateRenderer.POLICY_MAPPINGS_OID)) {
		return "Policy Mappings";
	} else if (oid.equals(X509CertificateRenderer.AUTHORITY_KEY_IDENTIFIER_OID)) {
		return "Authority Key Identifier";
	} else if (oid.equals(X509CertificateRenderer.POLICY_CONTRAINTS_OID)) {
		return "Policy Constraints";
	} else if (oid.equals(X509CertificateRenderer.CA_INFORMATION_ACCESS_OID)) {
		return "Certificate Authority Information Access";
	} else if (oid.equals(X509CertificateRenderer.CERTIFICATE_POLICIES)) {
		return "Certificate Policies";
	} else if (oid.equals(X509CertificateRenderer.EXT_KEY_USAGE_OID)) {
		return "Extended Key Usage";
	} else {
		return oid.toString(OID);
	}
}



/**
 * Create a HTML table which describes the key usage for the given certificate
 *
 * @param{X509} cert
 * @returns  HTML table describing the certificate's key usage
 * @type XML
 */
X509CertificateRenderer.prototype.createKeyUsageTable = function(cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var native = cert.getNative();

	/*
	 * KeyUsage ::= BIT STRING {
	 * 	digitalSignature        (0),
	 *      nonRepudiation          (1),
	 *      keyEncipherment         (2),
	 *      dataEncipherment        (3),
	 *      keyAgreement            (4),
	 *      keyCertSign             (5),
	 *      cRLSign                 (6),
	 *      encipherOnly            (7),
	 *      decipherOnly            (8) }
	 */
	var bitString = native.getKeyUsage();
	var t = <table/>
	for (var i = 0; i < bitString.length; i++) {
		if(bitString[i]) {
			t.appendChild(<tr><td>{X509CertificateRenderer.KEY_USAGE[i]}</td></tr>);
		}
	}
	return t;
}



/**
 * Create a HTML table which describes the extended key usage for the given certificate
 *
 * @param{X509} cert
 * @returns  HTML table describing the certificate's extended key usage
 * @type XML
 */
X509CertificateRenderer.prototype.createExtendedKeyUsageTable = function(cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var native = cert.getNative();

	var keyPurposeIDs = native.getExtendedKeyUsage(); // instance of Collections$UnmodifiableRandomAccessList
	var it = keyPurposeIDs.iterator();

	var t = <table/>
	while (it.hasNext()) {
		var keyPurposeID = it.next();

		var value = keyPurposeID;
		var oid = new ByteString(keyPurposeID, OID);
		if (oid.equals(X509CertificateRenderer.EXT_KEY_USAGE_SERVER_AUTHENTICATION_OID)) {
			value = "Server authentication";
		} else if (oid.equals(X509CertificateRenderer.EXT_KEY_USAGE_CLIENT_AUTHENTICATION_OID)) {
			value = "Client authentication";
		} else if (oid.equals(X509CertificateRenderer.EXT_KEY_USAGE_CODE_SIGNING_OID)) {
			value = "Code signing";
		} else if (oid.equals(X509CertificateRenderer.EXT_KEY_USAGE_EMAIL_OID)) {
			value = "Email";
		} else if (oid.equals(X509CertificateRenderer.EXT_KEY_USAGE_TIMESTAMPING_OID)) {
			value = "Timestamping";
		} else if (oid.equals(X509CertificateRenderer.EXT_KEY_USAGE_OCSP_SIGNING_OID)) {
			value = "OCSP signing";
		}

		t.appendChild(<tr><td>{value}</td></tr>);
	}

	return t;
}



/**
 * Create a HTML table which describes the Basic Constraints for the given certificate
 *
 * @param{X509} cert
 * @returns  HTML table describing the certificate's Basic Contstraints
 * @type XML
 */
X509CertificateRenderer.prototype.createBasicConstraintsTable = function(cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var native = cert.getNative();
	var pathLen = native.getBasicConstraints();
	var table = <table/>;
	if (pathLen >= 0) {
		table.appendChild(<tr><td>is CA certificate</td></tr>);
		table.appendChild(<tr><td>Path Length Constraint {pathLen}</td></tr>);
	} else {
		table.appendChild(<tr><td>is not CA certificate</td></tr>);
	}
	return table;
}



/**
 * Create a HTML table which describes the Certificate Authority Information Access for the given certificate
 *
 * @param{X509} cert
 * @returns  HTML table describing the certificate's Certificate Authority Information Access
 * @type XML
 */
X509CertificateRenderer.prototype.createAuthorityInformationAccessTable = function(cert) {
	var native = cert.getNative();

	var table = <table/>

	var value = native.getExtensionValue(X509CertificateRenderer.CA_INFORMATION_ACCESS_OID.toString(OID));
	var octetString = new ASN1(value);
	var list = new ASN1(octetString.value);
	for (var i = 0; i < list.elements; i++) {
		var accessDescription = list.get(i);
		var accessMethod = accessDescription.get(0);
		table.appendChild(<tr><td>OID {accessMethod.value.toString(OID)}</td></tr>);

		var accessLocation = accessDescription.get(1);
		table = this.appendGeneralNames(accessLocation, table);
	}

	return table;
}



/**
 * Decode ASN1 GeneralNames type and append it on the given table
 */
X509CertificateRenderer.prototype.appendGeneralNames = function(asn, table) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	if (asn.tagnumber == 4) {
		var nameSeq = new ASN1(asn.value);
		var commonName = nameSeq.get(0).get(0).get(1);
		var organizationName = nameSeq.get(1).get(0).get(1);
		var countryName = nameSeq.get(2).get(0).get(1);
		table.appendChild(<tr><td>Common Name</td><td>{commonName.value.toString(ASCII)}</td></tr>);
		table.appendChild(<tr><td>Organization Name</td><td>{organizationName.value.toString(ASCII)}</td></tr>);
		table.appendChild(<tr><td>Country Name</td><td>{countryName.value.toString(ASCII)}</td></tr>);
	} else if (asn.tagnumber == 6) {
		var uri = asn.value;
		table.appendChild(<tr><td>Uniform Resouce Identifier</td><td>{uri.toString(ASCII)}</td></tr>);
	}
	return table;
}



/**
 * Create a HTML table which describes the CRL Distribution Points for the given certificate
 *
 * @param{X509} cert
 * @returns  HTML table describing the certificate's CRL Distribution Points
 * @type XML
 */
X509CertificateRenderer.prototype.createCRLDistributionPointsTable = function(cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var native = cert.getNative();
	var value = native.getExtensionValue(X509CertificateRenderer.CRL_DISTRIBUTION_POINTS_OID.toString(OID));
	var points = new ASN1(value);
	var list = new ASN1(points.value);

	var distPoint = list.get(0);
	var seq = new ASN1(distPoint.value);
	seq = distPoint;

	var table = <table/>

	for (var i = 0; i < seq.elements; i++) {
		var element = seq.get(i);
		if (element.tag == 0xA0) { // distributionPoint DistributionPointName
			var name = element.get(0);
			if (name.tag == 0xA0) { // fullName GeneralNames
				var obj = new ASN1(name.value);
				table = this.appendGeneralNames(obj, table);
			} else if (name.tag == 0xA1) { // nameRelativeToCRLIssuer RelativeDistinguishedName

			}
		} else if (element.tagnumber == 1) { // reasons ReasonFlags

		} else if (element.tagnumber == 2) { // cRLIssuer GeneralNames
			var issuer = new ASN1(element.value);
			if (issuer.tagnumber == 4) {
				table = this.appendGeneralNames(issuer, table);
			}
		}
	}

	return table;
}



/**
 * Create a HTML table which describes the Certificate Policies for the given certificate
 *
 * @param{X509} cert
 * @returns  HTML table describing the certificate's Certificate Policies
 * @type XML
 */
X509CertificateRenderer.prototype.createCertificatePoliciesTable = function(cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var t = <table/>

	var native = cert.getNative();
	var value = native.getExtensionValue(X509CertificateRenderer.CERTIFICATE_POLICIES.toString(OID));
	var octetString = new ASN1(value);
	var certificatePolicies = new ASN1(octetString.value); // sequence of 1 to n PolicyInformation
	for (var i = 0; i < certificatePolicies.elements; i++) {
		var policyInformation = certificatePolicies.get(i);
		var policyIdentifier = policyInformation.get(0); // CertPolicyId

		var piTable = <table/>;
		piTable.appendChild(<tr><td>Policy Identifier</td><td>{policyIdentifier}</td></tr>);
		if (policyInformation.elements > 1) {
			var policyQualifiers = policyInformation.get(1).getBytes();
			piTable.appendChild(<tr><td>Policy Qualifiers</td><td>{policyQualifiers}</td></tr>);
		}
		t.appendChild(piTable);
	}

	return t;
}



/**
 * Create a HTML table which describes the key usage for the given certificate
 *
 * @param{X509} cert
 * @returns  HTML table describing the certificate's key usage
 * @type XML
 */
X509CertificateRenderer.prototype.createPrivateKeyUsagePeriodTable = function(cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var native = cert.getNative();
	var value = native.getExtensionValue(X509CertificateRenderer.PRIVATE_KEY_USAGE_PERIOD_OID.toString(OID));

	var octetString = new ASN1(value);
	var period = new ASN1(octetString.value);

	var t = <table/>

	for (var i = 0; i < period.elements; i++) {
		var date = period.get(i);
		if (date.tagnumber == 0x00) {
			t.appendChild(<tr><td>Not Before</td><td>{date.value.toString(ASCII)}</td></tr>);
		} else if (date.tagnumber == 0x01) {
			t.appendChild(<tr><td>Not After</td><td>{date.value.toString(ASCII)}</td></tr>);
		}
	}

	return t;
}



/**
 * Render a X509 certificate as HTML table
 *
 * @param{X509} cert
 * @returns  a html div element containing the certificate representation
 * @type XML
 */
X509CertificateRenderer.prototype.render = function(cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	var native = cert.getNative();

	var version = native.getVersion();
	var serial = cert.getSerialNumberString();
	var notBefore = cert.getNotBefore();
	var notAfter = cert.getNotAfter();
	var issuer = cert.getIssuerDNString();
	var subject = cert.getSubjectDNString();

	var sigAlg = native.getSigAlgName();
	var sig = native.getSignature();

	var t =
		<table class="content" style="word-wrap: break-word;">
			<colgroup>
				<col width="20"/>
				<col width="80"/>
			</colgroup>
			<tr>
				<th>Version</th>
				<td>{version}</td>
			</tr>
			<tr>
				<th>Serial</th>
				<td>{serial}</td>
			</tr>
			<tr>
				<th>Not Before</th>
				<td>{notBefore}</td>
			</tr>
			<tr>
				<th>Not After</th>
				<td>{notAfter}</td>
			</tr>
			<tr>
				<th>Issuer Distinguished Name</th>
				<td>{issuer}</td>
			</tr>
			<tr>
				<th>Subject Distinguished Name</th>
				<td>{subject}</td>
			</tr>
			<tr>
				<th>Signature Algorithm</th>
				<td>{sigAlg}</td>
			</tr>
			<tr>
				<th>Signature</th>
				<td>{sig}</td>
			</tr>
			<tr>
				<th>Public Key</th>
				<td>{this.getPublicKeyInfo(cert)}</td>
			</tr>
		</table>;

	var div = <div id="x509"></div>;
	div.appendChild(<h2>Basic Certificate Fields</h2>);
	div.appendChild(t);

	div = this.renderExtensions(cert, div);

	return div;
}



/**
 * Get a short textual representation of the certificate's public key
 *
 * @param{X509} cert
 * @returns
 * @type String
 */
X509CertificateRenderer.prototype.getPublicKeyInfo = function (cert) {
	//return cert.getNative().getPublicKey().toString();	// in case of ECC keys: only public key qx and qy parameters
	return cert.getNative().getPublicKey().getEncoded();	// binary encoded key
}



/**
 * Create a HTML table with a detailed public key representation for the given certificate
 *
 * @param{X509} cert
 * @returns  HTML table containing the public
 * @type XML
 */
X509CertificateRenderer.prototype.createPublicKeyDetailsTable = function (cert) {
	default xml namespace = "http://www.w3.org/1999/xhtml";
	var table = <table/>
	var key = cert.getPublicKey();
	var size = key.getSize();

	var modulus = key.getComponent(Key.MODULUS);
	if (typeof(modulus) != "undefined") {
		var modulus = modulus.toString(HEX);
		var exp = key.getComponent(Key.EXPONENT).toString(HEX);
		var table =
			<table word-break="break-all" word-wrap="break-word" max-width="32px">
				<tr>
					<td>Key Size</td>
					<td>{size}</td>
				</tr>
				<tr>
					<td>RSA Modulus</td>
					<td word-break="break-all" word-wrap="break-word" max-width="32px">{modulus}</td>
				</tr>
				<tr>
					<td>Public Exponent</td>
					<td>{exp}</td>
				</tr>
			</table>;
	} else {
		// curve parameter
		var fp = key.getComponent(Key.ECC_P);
		var ecca = key.getComponent(Key.ECC_A);
		var eccb = key.getComponent(Key.ECC_B);
		var gx = key.getComponent(Key.ECC_GX);
		var gy = key.getComponent(Key.ECC_GY);
		var eccn = key.getComponent(Key.ECC_N);
		var ecch = key.getComponent(Key.ECC_H);

		// public key
		var qx = key.getComponent(Key.ECC_QX).toString(HEX);
		var qy = key.getComponent(Key.ECC_QY).toString(HEX);

		var table =
			<table>
				<tr>
					<td>Key Size</td>
					<td>{size}</td>
				</tr>
				<tr>
					<td>Curve Fp</td>
					<td>{fp}</td>
				</tr>
				<tr>
					<td>Curve A</td>
					<td>{ecca}</td>
				</tr>
				<tr>
					<td>Curve B</td>
					<td>{eccb}</td>
				</tr>
				<tr>
					<td>Curve Parameter Gx</td>
					<td>{gx}</td>
				</tr>
				<tr>
					<td>Curve Parameter Gy</td>
					<td>{gy}</td>
				</tr>
				<tr>
					<td>Curve Parameter N</td>
					<td>{eccn}</td>
				</tr>
				<tr>
					<td>Curve Parameter H</td>
					<td>{ecch}</td>
				</tr>
				<tr>
					<td>Public Key Qx</td>
					<td>{qx}</td>
				</tr>
				<tr>
					<td>Public Key Qy</td>
					<td>{qy}</td>
				</tr>
			</table>;
	}

	return table;
}



X509CertificateRenderer.prototype.test = function() {
	default xml namespace = "http://www.w3.org/1999/xhtml";
	bs = new ByteString("\
	MIIGGzCCBAOgAwIBAgIRAS31fRUU00bNe4A4sqZ44wQwDQYJKoZIhvcNAQEFBQAw \
	VDESMBAGA1UEAwwJUm9vdC1DQSAxMTEwLwYDVQQKDChURVNUIC0gSGF1cHR2ZXJi \
	YW5kIMO2c3RlcnIuIFNvemlhbHZlcnMuMQswCQYDVQQGEwJBVDAeFw0wNTA2MjMx \
	NzI3MDJaFw0zMDA2MjMxNzI3MDJaMFYxFDASBgNVBAMMC1N5c3RlbSBDQSAxMTEw \
	LwYDVQQKDChURVNUIC0gSGF1cHR2ZXJiYW5kIMO2c3RlcnIuIFNvemlhbHZlcnMu \
	MQswCQYDVQQGEwJBVDCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCCAYoCggGBAKWL \
	/7+RLD7eqAiqbFtN/3sWgw5nfA3G6vYcVvV4CzXFlzJVk6xtiu/sYlSQK18tbyF4 \
	7DfNuHANV24lutFOoGLuhJkSWbqONcNvplD7a+XIniAdSgSBxcJnXvZ4xJ+Bd5TH \
	U4CXvcqDGpEaEAgnhpiVPoBMHK/r1eMrLsb9+HryCKBrC0dzVPPKX+HAz2wj757x \
	KdlrBva7dFz5pbDDZmifmTko4fj4DQS5quu4MVq2vs1D9km2BZXCgU5Fo6OWoL0a \
	U3B4amLzNA981E2niLovz+18DB340/PlgctE6FaM8XQv9Omoe/nUqImM/J+T8uIp \
	kFCy+1cuhXGRpqRnHvEq88COsvDFI6vKfwd9Duko+IjUzpq3MIa2bXURBU3kDD79 \
	sl1i1uy9Sx6YtwTZBoPIQZP+7WjlZnT4nBpJl2r0qKFKJH3nBJVntlzlSna1gc4u \
	HZBkvrfDnLG/RGGBsiqkzdx0myM8mON/veLbY5Nd+SUBm1bWAw0BSbz+3jBtHQID \
	AQABo4IBZDCCAWAwEwYDVR0jBAwwCoAIRtDR1WyRFs4wEQYDVR0OBAoECEvRRLys \
	X0iFMA4GA1UdDwEB/wQEAwICBDAxBggrBgEFBQcBAQQlMCMwIQYIKwYBBQUHMAGG \
	FWh0dHA6Ly8xNDkuMjM5LjE2LjIwOTCB3gYDVR0fBIHWMIHTMIHQoHOgcYZvbGRh \
	cDovLzE0OS4yMzkuMTYuMjA5L289VEVTVCUyMC0lMjBIYXVwdHZlcmJhbmQlMjAl \
	ZjZzdGVyci4lMjBTb3ppYWx2ZXJzLixjPUFUP2NlcnRpZmljYXRlUmV2b2NhdGlv \
	bkxpc3Q7YmluYXJ5olmkVzBVMRMwEQYDVQQDDApDUkwtU2lnbmVyMTEwLwYDVQQK \
	DChURVNUIC0gSGF1cHR2ZXJiYW5kIMO2c3RlcnIuIFNvemlhbHZlcnMuMQswCQYD \
	VQQGEwJBVDASBgNVHRMBAf8ECDAGAQH/AgEAMA0GCSqGSIb3DQEBBQUAA4ICAQAY \
	P81wkoVpuE6Dtg72snt2KnwURfI1KAD+WgDBKLcSUD+uO2ks7CpRWaqD5WW47lQD \
	KsGwLyRmwEfmNBPh15TMYkTvynUwD3WBaPPr59Hy7QrUcdRU511my0CnS3W+2L4a \
	oLCuyRvlozuIhBHCfSKsYFZwHrT90J+B9NFnlWCGsxg0xsKpatcXsrMOQTlX3dOl \
	5pu9KEoKlryZArD7UDBqMAqKQ9srx1a23AJKREFyJ6a4aW/voZvpoHMsQQPbm8xb \
	vQPZaUUqY7R9g/9ZgVdeDrjEJU8qtptSL1ixVbvmpKM0g+G4tda83VfVY5qeto6E \
	QLmst4yNA/uv5MxCtEu/DthxUScGkY1erV6LMb97u4m4mx87SxKPBhCdZx76BEgU \
	t0bLFAlG63h1bZ3UFcoDR3PSjF1QwUPO6DroCMVpUYRGnli123KQ63lKCOxQqwl+ \
	te7x3uEWKgN8FwUKCLYGnBIiBA2c7igRiyKaOon+43kYt+GAyBvOdH1n/EjHQVHE \
	h3xwWNCsiAn6XFjlL61i0r5dshBl+rWWyUbNpHXqHuPnm8Zn37DXwmvxU9qdc0TA \
	Y8M0uMYAw1rkDoo2zGb2nxAbmmp7L8J2cFE/6TJ6R7gdxY/0uwaIdRHBr844kscO \
	i0dKmGsaCPxCVq5venNSatNMEvOgyEloLGqoq3S+xQ==", BASE64);

	ca = new X509(bs);
	var t = this.render(ca);
	print(t);

	var page =
		<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en" >
			<head>
				<title>X509 Certificate Renderer</title>
			</head>
			<body/>
		</html>;

	page.body.appendChild(t);

	var cwd = GPSystem.mapFilename("", GPSystem.CWD);
	var file = new File(cwd + "/" + "test_table.html");
	file.writeAll(page.toXMLString());
}
