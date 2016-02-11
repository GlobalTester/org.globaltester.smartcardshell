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
 *  Function to name tags contained in Access Rules (EF.ARR)
 */



//
// Identify tags in the Expanded Access Rule found in EF_ARR
//
function ARRDecorator(asn1) {
	var recurse = false;
	var crt = false;
	
	switch(asn1.tag) {
	case 0x80:
		asn1.setName("accessMode");
		break;
	case 0x81:
		asn1.setName("commandP2");
		break;
	case 0x82:
		asn1.setName("commandP1");
		break;
	case 0x83:
		asn1.setName("commandP1P2");
		break;
	case 0x84:
		asn1.setName("commandINS");
		break;
	case 0x85:
		asn1.setName("commandINSP2");
		break;
	case 0x86:
		asn1.setName("commandINSP1");
		break;
	case 0x87:
		asn1.setName("commandINSP1P2");
		break;
	case 0x88:
		asn1.setName("commandCLA");
		break;
	case 0x89:
		asn1.setName("commandCLAP2");
		break;
	case 0x8A:
		asn1.setName("commandCLAP1");
		break;
	case 0x8B:
		asn1.setName("commandCLAP1P2");
		break;
	case 0x8C:
		asn1.setName("commandCLAINS");
		break;
	case 0x8D:
		asn1.setName("commandCLAINSP2");
		break;
	case 0x8E:
		asn1.setName("commandCLAINSP1");
		break;
	case 0x8F:
		asn1.setName("commandCLAINSP1P2");
		break;
	case 0x90:
		asn1.setName("always");
		break;
	case 0x97:
		asn1.setName("never");
		break;
	case 0x9C:
		asn1.setName("stateMachineDesc");
		break;
	case 0x9E:
		asn1.setName("securityConditionByte");
		break;
	case 0xA4:
		asn1.setName("authentication(AT)");
		crt = true;
		break;
	case 0xB4:
		asn1.setName("secureMessagingMac(CT)");
		crt = true;
		break;
	case 0xB6:
		asn1.setName("secureMessaging(DST)");
		crt = true;
		break;
	case 0xB8:
		asn1.setName("secureMessagingEnc(CCT)");
		crt = true;
		break;
	case 0xA0:
		asn1.setName("or");
		recurse = true;
		break;
	case 0xA7:
		asn1.setName("not");
		recurse = true;
		break;
	case 0xAF:
		asn1.setName("and");
		recurse = true;
		break;
	}
	
	if (recurse) {
		for (var i = 0; i < asn1.elements; i++) {
			ARRDecorator(asn1.get(i));
		}
	}
	
	if (crt) {
		for (var i = 0; i < asn1.elements; i++) {
			CRTDecorator(asn1.get(i));
		}
	}
}
