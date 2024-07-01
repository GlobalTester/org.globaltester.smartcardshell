/*
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
 *  Register of CardContact object identifier
 */


ASN1.defineObjectIdentifier("CardContact", "1.3.6.1.4.1.24991");

ASN1.defineObjectIdentifier("OpenSCDP", "CardContact 1");
ASN1.defineObjectIdentifier("cc-iso7816", "CardContact 2");
ASN1.defineObjectIdentifier("cc-pki", "CardContact 3");
ASN1.defineObjectIdentifier("cc-format", "CardContact 4");
ASN1.defineObjectIdentifier("cc-gp-profiles", "CardContact 16");

ASN1.defineObjectIdentifier("scsh3", "OpenSCDP 1");
ASN1.defineObjectIdentifier("scsh3gui", "OpenSCDP 2");

ASN1.defineObjectIdentifier("SmartCard-HSM", "cc-iso7816 1");
ASN1.defineObjectIdentifier("cc-apdutest", "cc-iso7816 2");
ASN1.defineObjectIdentifier("cc-packages", "cc-iso7816 127");

ASN1.defineObjectIdentifier("cc-roles", "cc-pki 1");
ASN1.defineObjectIdentifier("cc-role-sc-hsm", "cc-roles 1");

ASN1.defineObjectIdentifier("cc-extensions", "cc-pki 2");
ASN1.defineObjectIdentifier("id-IMPU", "cc-extensions 1");
ASN1.defineObjectIdentifier("id-key-domain-uid", "cc-extensions 2");
ASN1.defineObjectIdentifier("id-security-classification", "cc-extensions 3");

ASN1.defineObjectIdentifier("cc-ff-deviceid", "cc-format 1");
ASN1.defineObjectIdentifier("cc-ff-kdm", "cc-format 2");
ASN1.defineObjectIdentifier("cc-ff-pka", "cc-format 3");
ASN1.defineObjectIdentifier("cc-ff-kda", "cc-format 4");
ASN1.defineObjectIdentifier("cc-ff-kdc", "cc-format 5");

ASN1.defineObjectIdentifier("cc-kdc-groupvpn-v1", "cc-ff-kdc 1 1");
ASN1.defineObjectIdentifier("cc-kdc-psk-v1", "cc-ff-kdc 2 1");
