/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2018 CardContact Software & System Consulting
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
 * @fileoverview X509Name - Class to support X500 Names
 */

// 	Name ::= CHOICE {
// 	     RDNSequence }
//
// 	RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
//
// 	RelativeDistinguishedName ::=
// 		SET OF AttributeTypeAndValue
//
// 	AttributeTypeAndValue ::= SEQUENCE {
// 		type     AttributeType,
// 		value    AttributeValue }
//
// 	AttributeType ::= OBJECT IDENTIFIER
//
// 	AttributeValue ::= ANY DEFINED BY AttributeType



X509Name.name = "550429";
X509Name.surname = "550404";
X509Name.givenname = "55042A";
X509Name.initials = "55042B";
X509Name.generationQualifier = "55042C";
X509Name.commonName = "550403";
X509Name.localityName = "550407";
X509Name.stateOrProvinceName = "550408";
X509Name.organizationName = "55040A";
X509Name.organizationalUnitName = "55040B";
X509Name.title = "55040C";
X509Name.dnQualifier = "55042E";
X509Name.countryName = "550406";
X509Name.serialNumber = "550405";
X509Name.emailAddress = "2A864886F70D010901";



function X509Name(subjectDN) {
	this.rdn = new Array();
	this.parseRDNSequence(subjectDN);
}

exports.X509Name = X509Name;



X509Name.prototype.parseRDNSequence = function(rdnSeq) {
	if (rdnSeq instanceof ASN1) {
		if (!rdnSeq.isconstructed) {
			throw new GPError("X509Name", GPError.INVALID_DATA, 1, "Name must be constructed");
		}

		if (rdnSeq.tag != ASN1.SEQUENCE) {
			throw new GPError("X509Name", GPError.INVALID_DATA, 1, "RDNSequence must be SEQUENCE");
		}

		for (var i = 0; i < rdnSeq.elements; i++) {
			var set = rdnSeq.get(i)
			if (set.tag != ASN1.SET) {
				throw new GPError("X509Name", GPError.INVALID_DATA, 1, "RDNSequence must only contain SETs");
			}
			for (var j = 0; j < set.elements; j++) {
				var attr = set.get(j);
				if (attr.tag != ASN1.SEQUENCE) {
					throw new GPError("X509Name", GPError.INVALID_DATA, 1, "AttributeTypeAndValue must be SEQUENCE");
				}
				if (attr.elements != 2) {
					throw new GPError("X509Name", GPError.INVALID_DATA, 1, "AttributeTypeAndValue must have 2 elements");
				}
				var attrType = attr.get(0);
				if (attrType.tag != ASN1.OBJECT_IDENTIFIER) {
					throw new GPError("X509Name", GPError.INVALID_DATA, 1, "AttributeType must be OBJECT IDENTIFIER");
				}
				var oid = attrType.value.toString(HEX);
				var attrValue = attr.get(1);
				this.rdn[oid] = attrValue;
			}
		}
	} else {
		throw new GPError("X509Name", GPError.INVALID_TYPE, 1, "Argument must be of type ASN1");
	}
}



X509Name.prototype.hasRDN = function(oid) {
	return this.rdn[oid] != undefined;
}



X509Name.prototype.getRDNAsString = function(oid) {
	var r = this.rdn[oid];
	if (r == undefined) {
		throw new GPError("X509Name", GPError.INVALID_INDEX,0,"No matching RDN found");
	}

	if (r.tag == ASN1.UTF8String) {
		return r.value.toString(UTF8);
	} else {
		return r.value.toString(ASCII);
	}
}



X509Name.prototype.toString = function() {
	var result = "";

	if (this.hasRDN(X509Name.countryName)) {
		result += "C=" + this.getRDNAsString(X509Name.countryName);
	}

	if (this.hasRDN(X509Name.stateOrProvinceName)) {
		if (result.length > 0)
			result += ",";
		result += "ST=" + this.getRDNAsString(X509Name.stateOrProvinceName);
	}

	if (this.hasRDN(X509Name.organizationName)) {
		if (result.length > 0)
			result += ",";

		result += "O=" + this.getRDNAsString(X509Name.organizationName);
	}

	if (this.hasRDN(X509Name.organizationalUnitName)) {
		if (result.length > 0)
			result += ",";

		result += "OU=" + this.getRDNAsString(X509Name.organizationalUnitName);
	}

	if (this.hasRDN(X509Name.localityName)) {
		if (result.length > 0)
			result += ",";
		result += "L=" + this.getRDNAsString(X509Name.localityName);
	}

	if (this.hasRDN(X509Name.title)) {
		if (result.length > 0)
			result += ",";
		result += "T=" + this.getRDNAsString(X509Name.title);
	}

	if (this.hasRDN(X509Name.givenname)) {
		if (result.length > 0)
			result += ",";
		result += "G=" + this.getRDNAsString(X509Name.givenname);
	}

	if (this.hasRDN(X509Name.surname)) {
		if (result.length > 0)
			result += ",";
		result += "S=" + this.getRDNAsString(X509Name.surname);
	}

	if (this.hasRDN(X509Name.generationQualifier)) {
		if (result.length > 0)
			result += ",";
		result += "generationQualifier=" + this.getRDNAsString(X509Name.generationQualifier);
	}

	if (this.hasRDN(X509Name.name)) {
		if (result.length > 0)
			result += ",";
		result += "N=" + this.getRDNAsString(X509Name.name);
	}

	if (this.hasRDN(X509Name.initials)) {
		if (result.length > 0)
			result += ",";
		result += "initials=" + this.getRDNAsString(X509Name.initials);
	}

	if (this.hasRDN(X509Name.commonName)) {
		if (result.length > 0)
			result += ",";
		result += "CN=" + this.getRDNAsString(X509Name.commonName);
	}


	if (this.hasRDN(X509Name.serialNumber)) {
		if (result.length > 0)
			result += ",";
		result += "SERIALNUMBER=" + this.getRDNAsString(X509Name.serialNumber);
	}

	if (this.hasRDN(X509Name.dnQualifier)) {
		if (result.length > 0)
			result += ",";
		result += "DNQ=" + this.getRDNAsString(X509Name.dnQualifier);
	}

	if (this.hasRDN(X509Name.emailAddress)) {
		if (result.length > 0)
			result += ",";
		result += "E=" + this.getRDNAsString(X509Name.emailAddress);
	}

	return result;
}
