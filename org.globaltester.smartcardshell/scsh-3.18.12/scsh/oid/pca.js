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
 *  Register of predefined object identifier for PCA applications
 */



ASN1.defineObjectIdentifier("id-BSNk-scheme-nl", "2.16.528.1.1003.10");

ASN1.defineObjectIdentifier("id-PCA", "id-BSNk-scheme-nl 9");

ASN1.defineObjectIdentifier("id-PCA-info", "id-PCA 1");

ASN1.defineObjectIdentifier("id-PCA-AT", "id-PCA 2");

ASN1.defineObjectIdentifier("id-PCA-PIP-formats", "id-PCA 3");

ASN1.defineObjectIdentifier("id-PCA-PIP", "id-PCA-PIP-formats 1");
ASN1.defineObjectIdentifier("id-PCA-PIP-compressed", "id-PCA-PIP-formats 2");
ASN1.defineObjectIdentifier("id-PCA-PIP-reduced-compressed", "id-PCA-PIP-formats 3");
ASN1.defineObjectIdentifier("id-PCA-PIP-reduced-uncompressed", "id-PCA-PIP-formats 4");

ASN1.defineObjectIdentifier("id-PCA-PP-formats", "id-PCA 4");

ASN1.defineObjectIdentifier("id-PCA-PP", "id-PCA-PP-formats 1");
ASN1.defineObjectIdentifier("id-PCA-PP-compressed", "id-PCA-PP-formats 2");
ASN1.defineObjectIdentifier("id-PCA-PP-reduced-compressed", "id-PCA-PP-formats 3");
ASN1.defineObjectIdentifier("id-PCA-PP-reduced-uncompressed", "id-PCA-PP-formats 4");

ASN1.defineObjectIdentifier("id-PCA-PI-formats", "id-PCA 5");

ASN1.defineObjectIdentifier("id-PCA-PI", "id-PCA-PI-formats 1");
ASN1.defineObjectIdentifier("id-PCA-PI-compressed", "id-PCA-PI-formats 2");
ASN1.defineObjectIdentifier("id-PCA-PI-reduced-compressed", "id-PCA-PI-formats 3");
ASN1.defineObjectIdentifier("id-PCA-PI-reduced-uncompressed", "id-PCA-PI-formats 4");
