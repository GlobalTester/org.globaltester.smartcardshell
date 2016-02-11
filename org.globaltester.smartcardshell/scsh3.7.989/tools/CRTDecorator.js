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
 *  Function to name tags contained in Control Reference Templates (CRT)
 */



//
// Identify tags in the Control Reference Template
//
function CRTDecorator(asn1) {
	switch(asn1.tag) {
	case 0x80:
		asn1.setName("cryptographicMechanism");
		break;
	case 0x81:
		asn1.setName("fileIdentifierOrPath");
		break;
	case 0x82:
		asn1.setName("dFName");
		break;
	case 0x83:
		asn1.setName("secretOrPublicKeyReference");
		break;
	case 0x84:
		asn1.setName("sessionOrPrivateKeyReference");
		break;
	case 0x85:
		asn1.setName("nullBlock");
		break;
	case 0x86:
		asn1.setName("chainingBlock");
		break;
	case 0x87:
		asn1.setName("initialBlock");
		break;
	case 0x88:
		asn1.setName("previousChallenge");
		break;
	case 0x89:
		asn1.setName("proprietaryDataElementIndex");
		break;
	case 0x8A:
		asn1.setName("proprietaryDataElementIndex");
		break;
	case 0x8B:
		asn1.setName("proprietaryDataElementIndex");
		break;
	case 0x8C:
		asn1.setName("proprietaryDataElementIndex");
		break;
	case 0x8D:
		asn1.setName("proprietaryDataElementIndex");
		break;
	case 0x90:
		asn1.setName("cardHashCode");
		break;
	case 0x91:
		asn1.setName("cardRandomNumber");
		break;
	case 0x92:
		asn1.setName("cardTimeStamp");
		break;
	case 0x93:
		asn1.setName("dsiCounter");
		break;
	case 0x94:
		asn1.setName("challengeOrDerivationParameter ");
		break;
	case 0x95:
		asn1.setName("usageQualifier");
		break;
	case 0x8E:
		asn1.setName("cryptographicContentReference");
		break;
	}
}
