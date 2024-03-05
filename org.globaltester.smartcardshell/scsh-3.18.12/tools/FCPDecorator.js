/*
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|  
 * |#       #|  Copyright (c) 1999-2006 CardContact Software & System Consulting
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
 *  Function to name tags contained in FCP, FMD or FCI data structure
 */



//
// Decorator for security attributes in FCPs
//
function SADecorator(asn1) {
	var recurse = false;
	
	switch(asn1.tag) {
	case 0x86:
		asn1.setName("proprietarySecurityAttributes");
		break;
	case 0x8B:
		asn1.setName("securityAttributeReferenceExpanded");
		break;
	case 0x8C:
		asn1.setName("securityAttributeCompact");
		break;
	case 0x8B:
		asn1.setName("securityAttributeExtended");
		break;
	case 0xA0:
		asn1.setName("securityAttributeForDataObjects");
		recurse = true;
		break;
	case 0xA1:
		asn1.setName("securityAttributeForInterfaces");
		recurse = true;
		break;
	case 0xAB:
		asn1.setName("securityAttributeTemplateExpanded");
		for (var i = 0; i < asn1.elements; i++) {
			ARRDecorator(asn1.get(i));
		}
		break;
	}
	
	if (recurse) {
		for (var i = 0; i < asn1.elements; i++) {
			SADecorator(asn1.get(i));
		}
	}
}



//
// Identify tags in the FCP and assign a name
//
function FCPDecorator(asn1) {
	switch(asn1.tag) {
	case 0x62:
		asn1.setName("FCP");
		break;
	case 0x64:
		asn1.setName("FMD");
		break;
	case 0x6F:
		asn1.setName("FCI");
		break;
	}
	
	for (var i = 0; i < asn1.elements; i++) {
		var t = asn1.get(i);
		switch(t.tag) {
		case 0x80:
			t.setName("numberOfBytes");
			break;
		case 0x81:
			t.setName("numberOfBytesStructural");
			break;
		case 0x82:
			t.setName("fileDescriptor");
			break;
		case 0x83:
			t.setName("fileIdentifier");
			break;
		case 0x84:
			t.setName("dFName");
			break;
		case 0x85:
			t.setName("proprietaryInformationPlain");
			break;
		case 0x87:
			t.setName("idOfFCIExtension");
			break;
		case 0x88:
			t.setName("shortFileIdentifier");
			break;
		case 0x8A:
			t.setName("lifeCycleStatusByte");
			break;
		case 0x8D:
			t.setName("idOfSecurityEnvironmentTemplates");
			break;
		case 0x8B:
			t.setName("securityAttributeExtended");
			break;
		case 0xA5:
			t.setName("proprietaryInformationTLV");
			break;
		case 0xAC:
			t.setName("cryptoMechanismsIdentifier");
			break;
		default:
			SADecorator(t);
		}
	}
}
