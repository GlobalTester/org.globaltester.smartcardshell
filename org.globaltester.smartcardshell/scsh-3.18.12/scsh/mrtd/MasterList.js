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
 * @fileoverview Simple CVC-CA
 */

PKIXCommon 		= require('scsh/x509/PKIXCommon').PKIXCommon;

//
//	CscaMasterList
//	{ iso-itu-t(2) international-organization(23) icao(136) mrtd(1)
//	security(1) masterlist(2)}
//
//	DEFINITIONS IMPLICIT TAGS ::=
//	BEGIN
//
//	IMPORTS
//
//	-- Imports from RFC 3280 [PROFILE], Appendix A.1
//		Certificate
//			FROM PKIX1Explicit88
//				{ iso(1) identified-organization(3) dod(6)
//				internet(1) security(5) mechanisms(5) pkix(7)
//				mod(0) pkix1-explicit(18) };
//
//	-- CSCA Master List
//
//	CscaMasterListVersion ::= INTEGER {v0(0)}
//
//	CscaMasterList ::= SEQUENCE {
//		version		CscaMasterListVersion,
//		certList	SET OF Certificate }
//
//	-- Object Identifiers
//
//	id-icao OBJECT IDENTIFIER ::= {2 23 136 }
//	id-icao-mrtd OBJECT IDENTIFIER ::= {id-icao 1}
//	id-icao-mrtd-security OBJECT IDENTIFIER ::= {id-icao-mrtd 1}
//	id-icao-cscaMasterList OBJECT IDENTIFIER ::= {id-icao-mrtd-security 2}
//	id-icao-cscaMasterListSigningKey OBJECT IDENTIFIER ::= {id-icao-mrtd-security 3}
//	END


/**
 * Create MasterList object initialized from passed Master List
 *
 * @constructor
 * @param {ByteString} masterList the binary master list
 */
function MasterList(masterList) {
	this.masterList = masterList;
	this.mlcms = new CMSSignedData(this.masterList);

	var ct = this.mlcms.getEContentType();

	if (!ct.equals(new ByteString("id-icao-cscaMasterList", OID))) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "Content type is not id-icao-cscaMasterList, but " + ct.toString(OID));
	}

	var signers = this.mlcms.getNumberOfSigners();
	if (signers < 1) {
		throw new GPError(module.id, GPError.INVALID_DATA, 0, "No signer found in master list");
	}

	var cert = this.mlcms.getCertificate(0);
	this.signerDN = cert.getSubjectDNString();
	GPSystem.log(GPSystem.DEBUG, module.id, "Signed by   : " + this.signerDN);

	var rdns = PKIXCommon.parseDN(this.signerDN);

	var cn = rdns[rdns.length - 1].CN;
	if (!cn) {
		cn = rdns[0].CN;
	}

	this.signerCN = cn;
	GPSystem.log(GPSystem.DEBUG, module.id, "Signer CN   : " + this.signerCN);

	this.signingTime = this.mlcms.getSignerInfoSignedAttribute(0, CMSSignedData.ATTR_SIGNINGTIME).toString(ASCII);
	GPSystem.log(GPSystem.DEBUG, module.id, "Signing time: " + this.signingTime);
}

exports.MasterList = MasterList;



/**
 * Check if certificate is a root certificate
 *
 * @private
 * @param {X509} cert the certificate
 * @type boolean
 * @return true if self-signed root
 */
MasterList.isRootCondition = function(issuer, subject, autid, subid) {
	if (autid) {
		return autid.equals(subid);
	}

	return (issuer.equals(subject));
}



/**
 * Check if certificate is a root certificate
 *
 * @param {X509} cert the certificate
 * @type boolean
 * @return true if self-signed root
 */
MasterList.isRoot = function(cert) {
	var issuer = cert.getIssuerDNString();
	var subject = cert.getSubjectDNString();
	var autid = cert.getAuthorityKeyIdentifier();
	var subid = cert.getSubjectKeyIdentifier();
	return MasterList.isRootCondition(issuer, subject, autid, subid);
}



/**
 * Get the master list signing time
 *
 * @type Date
 * @return the date and time when the master list was signed
 */
MasterList.prototype.getSigningTime = function() {
	var st = this.signingTime;

	var year = 2000 + parseInt(st.substr(0,2), 10);
	var mon = parseInt(st.substr(2,2), 10) - 1;
	var day = parseInt(st.substr(4,2), 10);
	var hour = parseInt(st.substr(6,2), 10);
	var min = parseInt(st.substr(8,2), 10);
	var sec = parseInt(st.substr(10,2), 10);

	return new Date(Date.UTC(year, mon, day, hour, min, sec));
}



/**
 * Get the master list signer DN
 *
 * @type String
 * @return the signer DN
 */
MasterList.prototype.getSignerDN = function() {
	return this.signerDN;
}



/**
 * Get the list of certificates from the Master List
 *
 * @type X509[]
 * @return the list of certificates
 */
MasterList.prototype.getCertificateList = function() {
	var sc = this.mlcms.getSignedContent();

	var a = new ASN1(sc);
	var version = a.get(0).value;
	assert(version.byteAt(0) == 0, "version must be 0");
	var certList = a.get(1);

	var list = [];

	for (var i = 0; i < certList.elements; i++) {
		var certbin = certList.get(i).getBytes();
		var cert = new X509(certbin);
		list.push(cert);
	}
	return list;
}



/**
 * Get the list of certificates from the Master List
 *
 * @type X509[]
 * @return the list of certificates
 */
MasterList.prototype.decode = function() {
	var sc = this.mlcms.getSignedContent();

	var a = new ASN1(sc);
	var version = a.get(0).value;
	assert(version.byteAt(0) == 0, "version must be 0");
	var certList = a.get(1);

	this.kidMap = {};
	this.dnMap = {};

	for (var i = 0; i < certList.elements; i++) {
		var certbin = certList.get(i).getBytes();
		var cert = new X509(certbin);

		var issuer = cert.getIssuerDNString();
		var subject = cert.getSubjectDNString();
		var autid = cert.getAuthorityKeyIdentifier();
		var subid = cert.getSubjectKeyIdentifier();

		if (MasterList.isRootCondition(issuer, subject, autid, subid)) {
			GPSystem.log(GPSystem.DEBUG, module.id, "+I:" + issuer);
			GPSystem.log(GPSystem.DEBUG, module.id, "+S:" + subject);
			if (this.kidMap[subid.toString(HEX)]) {
				GPSystem.log(GPSystem.DEBUG, module.id, "Duplicate root certificate for key id " + subid);
			}
			this.kidMap[subid.toString(HEX)] = cert;
			this.dnMap[subject] = cert;
		} else {
			GPSystem.log(GPSystem.DEBUG, module.id, "-I:" + issuer);
			GPSystem.log(GPSystem.DEBUG, module.id, "-S:" + subject);
		}
	}
}



/**
 * Validate master list certificate and signature using existing master list as trust anchor
 *
 * This method will accept any CSCA certificate in the master list as CA for the master list signer certificate
 *
 * Throws an exception if validation failed.
 *
 * @param {MasterList} masterlist the existing master list
 */
MasterList.prototype.validateWithMasterList = function(masterlist) {
	var cert = this.mlcms.getCertificate(0);

	var autid = cert.getAuthorityKeyIdentifier();

	var issuer = masterlist.getCertificateByKeyId(autid);
	if (!issuer) {
		throw new GPError("", GPError.OBJECT_NOT_FOUND, 0, "No certificate found to validate Master List signer certificate");
	}

	cert.verifyWith(issuer);

	if (!this.mlcms.isSignerInfoSignatureValid(0, cert.getBytes())) {
		throw new GPError("", GPError.SIGNATURE_FAILED, 0, "Master List signature verification failed");
	}
}



/**
 * Return trusted certificate with the given SubjectkeyIdentifier
 *
 * @param {ByteString} keyId the key identifier
 * @type X509
 * @return the certificate or undefined
 */
MasterList.prototype.getCertificateByKeyId = function(keyId) {
	return(this.kidMap[keyId.toString(HEX)]);
}



/**
 * Return trusted certificate with the given Subject DN
 *
 * @param {String} dn the issuer's DN
 * @type X509
 * @return the certificate or undefined
 */
MasterList.prototype.getCertificateByDN = function(dn) {
	return(this.dnMap[dn]);
}



/**
 * Return encoded Masterlist
 *
 * @type ByteString
 * @return the encoded master list
 */
MasterList.prototype.getBytes = function() {
	return this.masterList;
}



MasterList.prototype.toString = function() {
	return this.signerCN + " (" + this.signingTime.toString(ASCII) + ")";
}
