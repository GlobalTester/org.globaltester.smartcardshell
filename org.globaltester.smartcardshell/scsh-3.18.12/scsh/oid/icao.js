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
 *  Register of predefined object identifier for ICAO applications
 */


ASN1.defineObjectIdentifier("id-icao", "2.23.136");
ASN1.defineObjectIdentifier("id-icao-mrtd", "id-icao 1");
ASN1.defineObjectIdentifier("id-icao-mrtd-security", "id-icao-mrtd 1");
ASN1.defineObjectIdentifier("id-icao-ldsSecurityObject", "id-icao-mrtd-security 1");
ASN1.defineObjectIdentifier("id-icao-cscaMasterList", "id-icao-mrtd-security 2");
ASN1.defineObjectIdentifier("id-icao-cscaMasterListSigningKey", "id-icao-mrtd-security 3");


ASN1.defineObjectIdentifier("bsi-de", "itu-t(0) identified-organization(4) etsi(0) reserved(127) etsi-identified-organization(0) 7");

// ECC from TR 03111
ASN1.defineObjectIdentifier("id-ecc", "bsi-de algorithms(1) 1");

ASN1.defineObjectIdentifier("ansi-X9-62", "iso(1) member-body(2) us(840) 10045");
ASN1.defineObjectIdentifier("id-publicKeyType", "ansi-X9-62 keyType(2)");
ASN1.defineObjectIdentifier("id-ecPublicKey", "id-publicKeyType 1");
ASN1.defineObjectIdentifier("id-fieldType", "ansi-X9-62 fieldType(1)");
ASN1.defineObjectIdentifier("prime-field", "id-fieldType 1");
ASN1.defineObjectIdentifier("id-ecSigType", "ansi-X9-62 signatures(4)");

ASN1.defineObjectIdentifier("id-ecTLVKeyFormat", "id-ecc keyType(2) 2");
ASN1.defineObjectIdentifier("id-ecTLVPublicKey", "id-ecTLVKeyFormat unrestricted(1)");
ASN1.defineObjectIdentifier("ecdsa-plain-signatures", "id-ecc signatures(4) 1");
ASN1.defineObjectIdentifier("ecdsa-plain-SHA1", "ecdsa-plain-signatures 1");
ASN1.defineObjectIdentifier("ecdsa-plain-SHA224", "ecdsa-plain-signatures 2");
ASN1.defineObjectIdentifier("ecdsa-plain-SHA256", "ecdsa-plain-signatures 3");
ASN1.defineObjectIdentifier("ecdsa-plain-SHA384", "ecdsa-plain-signatures 4");
ASN1.defineObjectIdentifier("ecdsa-plain-SHA512", "ecdsa-plain-signatures 5");
ASN1.defineObjectIdentifier("ecdsa-plain-RIPEMD160", "ecdsa-plain-signatures 6");

ASN1.defineObjectIdentifier("ecka-eg", "id-ecc key-establishment(5) 1");
ASN1.defineObjectIdentifier("ecka-eg-X963KDF", "ecka-eg 1");
ASN1.defineObjectIdentifier("ecka-eg-X963KDF-SHA1", "ecka-eg-X963KDF 1");
ASN1.defineObjectIdentifier("ecka-eg-X963KDF-SHA224", "ecka-eg-X963KDF 2");
ASN1.defineObjectIdentifier("ecka-eg-X963KDF-SHA256", "ecka-eg-X963KDF 3");
ASN1.defineObjectIdentifier("ecka-eg-X963KDF-SHA384", "ecka-eg-X963KDF 4");
ASN1.defineObjectIdentifier("ecka-eg-X963KDF-SHA512", "ecka-eg-X963KDF 5");
ASN1.defineObjectIdentifier("ecka-eg-X963KDF-RIPEMD160", "ecka-eg-X963KDF 6");
ASN1.defineObjectIdentifier("ecka-eg-SessionKDF", "ecka-eg 2");
ASN1.defineObjectIdentifier("ecka-eg-SessionKDF-3DES", "ecka-eg-SessionKDF 1");
ASN1.defineObjectIdentifier("ecka-eg-SessionKDF-AES128", "ecka-eg-SessionKDF 2");
ASN1.defineObjectIdentifier("ecka-eg-SessionKDF-AES192", "ecka-eg-SessionKDF 3");
ASN1.defineObjectIdentifier("ecka-eg-SessionKDF-AES256", "ecka-eg-SessionKDF 4");

ASN1.defineObjectIdentifier("ecka-dh", "id-ecc key-establishment(5) 2");
ASN1.defineObjectIdentifier("ecka-dh-X963KDF", "ecka-dh 1");
ASN1.defineObjectIdentifier("ecka-dh-X963KDF-SHA1", "ecka-dh-X963KDF 1");
ASN1.defineObjectIdentifier("ecka-dh-X963KDF-SHA224", "ecka-dh-X963KDF 2");
ASN1.defineObjectIdentifier("ecka-dh-X963KDF-SHA256", "ecka-dh-X963KDF 3");
ASN1.defineObjectIdentifier("ecka-dh-X963KDF-SHA384", "ecka-dh-X963KDF 4");
ASN1.defineObjectIdentifier("ecka-dh-X963KDF-SHA512", "ecka-dh-X963KDF 5");
ASN1.defineObjectIdentifier("ecka-dh-X963KDF-RIPEMD160", "ecka-dh-X963KDF 6");
ASN1.defineObjectIdentifier("ecka-dh-SessionKDF", "ecka-dh 2");
ASN1.defineObjectIdentifier("ecka-dh-SessionKDF-3DES", "ecka-dh-SessionKDF 1");
ASN1.defineObjectIdentifier("ecka-dh-SessionKDF-AES128", "ecka-dh-SessionKDF 2");
ASN1.defineObjectIdentifier("ecka-dh-SessionKDF-AES192", "ecka-dh-SessionKDF 3");
ASN1.defineObjectIdentifier("ecka-dh-SessionKDF-AES256", "ecka-dh-SessionKDF 4");

ASN1.defineObjectIdentifier("ecStdCurvesAndGeneration", "iso(1) identified-organization(3) teletrust(36) algorithm(3) signature-algorithm(3) ecSign(2) ecStdCurvesAndGeneration(8)");
ASN1.defineObjectIdentifier("ellipticCurve", "ecStdCurvesAndGeneration 1");
ASN1.defineObjectIdentifier("versionOne", "ellipticCurve 1");
ASN1.defineObjectIdentifier("brainpoolP160r1", "versionOne 1");
ASN1.defineObjectIdentifier("brainpoolP160t1", "versionOne 2");
ASN1.defineObjectIdentifier("brainpoolP192r1", "versionOne 3");
ASN1.defineObjectIdentifier("brainpoolP192t1", "versionOne 4");
ASN1.defineObjectIdentifier("brainpoolP224r1", "versionOne 5");
ASN1.defineObjectIdentifier("brainpoolP224t1", "versionOne 6");
ASN1.defineObjectIdentifier("brainpoolP256r1", "versionOne 7");
ASN1.defineObjectIdentifier("brainpoolP256t1", "versionOne 8");
ASN1.defineObjectIdentifier("brainpoolP320r1", "versionOne 9");
ASN1.defineObjectIdentifier("brainpoolP320t1", "versionOne 10");
ASN1.defineObjectIdentifier("brainpoolP384r1", "versionOne 11");
ASN1.defineObjectIdentifier("brainpoolP384t1", "versionOne 12");
ASN1.defineObjectIdentifier("brainpoolP512r1", "versionOne 13");
ASN1.defineObjectIdentifier("brainpoolP512t1", "versionOne 14");


// PACE from TR 03110 (EAC 2.0)
ASN1.defineObjectIdentifier("id-PACE", "bsi-de protocols(2) smartcard(2) 4");
ASN1.defineObjectIdentifier("id-PACE-DH-GM", "id-PACE 1");
ASN1.defineObjectIdentifier("id-PACE-DH-GM-3DES-CBC-CBC", "id-PACE-DH-GM 1");
ASN1.defineObjectIdentifier("id-PACE-DH-GM-AES-CBC-CMAC-128", "id-PACE-DH-GM 2");
ASN1.defineObjectIdentifier("id-PACE-DH-GM-AES-CBC-CMAC-192", "id-PACE-DH-GM 3");
ASN1.defineObjectIdentifier("id-PACE-DH-GM-AES-CBC-CMAC-256", "id-PACE-DH-GM 4");

ASN1.defineObjectIdentifier("id-PACE-ECDH-GM", "id-PACE 2");
ASN1.defineObjectIdentifier("id-PACE-ECDH-GM-3DES-CBC-CBC", "id-PACE-ECDH-GM 1");
ASN1.defineObjectIdentifier("id-PACE-ECDH-GM-AES-CBC-CMAC-128", "id-PACE-ECDH-GM 2");
ASN1.defineObjectIdentifier("id-PACE-ECDH-GM-AES-CBC-CMAC-192", "id-PACE-ECDH-GM 3");
ASN1.defineObjectIdentifier("id-PACE-ECDH-GM-AES-CBC-CMAC-256", "id-PACE-ECDH-GM 4");

ASN1.defineObjectIdentifier("id-PACE-DH-IM", "id-PACE 3");
ASN1.defineObjectIdentifier("id-PACE-DH-IM-3DES-CBC-CBC", "id-PACE-DH-IM 1");
ASN1.defineObjectIdentifier("id-PACE-DH-IM-AES-CBC-CMAC-128", "id-PACE-DH-IM 2");
ASN1.defineObjectIdentifier("id-PACE-DH-IM-AES-CBC-CMAC-192", "id-PACE-DH-IM 3");
ASN1.defineObjectIdentifier("id-PACE-DH-IM-AES-CBC-CMAC-256", "id-PACE-DH-IM 4");

ASN1.defineObjectIdentifier("id-PACE-ECDH-IM", "id-PACE 4");
ASN1.defineObjectIdentifier("id-PACE-ECDH-IM-3DES-CBC-CBC", "id-PACE-ECDH-IM 1");
ASN1.defineObjectIdentifier("id-PACE-ECDH-IM-AES-CBC-CMAC-128", "id-PACE-ECDH-IM 2");
ASN1.defineObjectIdentifier("id-PACE-ECDH-IM-AES-CBC-CMAC-192", "id-PACE-ECDH-IM 3");
ASN1.defineObjectIdentifier("id-PACE-ECDH-IM-AES-CBC-CMAC-256", "id-PACE-ECDH-IM 4");


// CA from TR 03110 (EAC 2.0)
ASN1.defineObjectIdentifier("id-CA", "bsi-de protocols(2) smartcard(2) 3");

ASN1.defineObjectIdentifier("id-CA-DH", "id-CA 1");
ASN1.defineObjectIdentifier("id-CA-DH-3DES-CBC-CBC", "id-CA-DH 1");
ASN1.defineObjectIdentifier("id-CA-DH-AES-CBC-CMAC-128", "id-CA-DH 2");
ASN1.defineObjectIdentifier("id-CA-DH-AES-CBC-CMAC-192", "id-CA-DH 3");
ASN1.defineObjectIdentifier("id-CA-DH-AES-CBC-CMAC-256", "id-CA-DH 4");

ASN1.defineObjectIdentifier("id-CA-ECDH", "id-CA 2");
ASN1.defineObjectIdentifier("id-CA-ECDH-3DES-CBC-CBC", "id-CA-ECDH 1");
ASN1.defineObjectIdentifier("id-CA-ECDH-AES-CBC-CMAC-128", "id-CA-ECDH 2");
ASN1.defineObjectIdentifier("id-CA-ECDH-AES-CBC-CMAC-192", "id-CA-ECDH 3");
ASN1.defineObjectIdentifier("id-CA-ECDH-AES-CBC-CMAC-256", "id-CA-ECDH 4");


// CA from TR 03110 (EAC 2.0)
ASN1.defineObjectIdentifier("id-PK", "bsi-de protocols(2) smartcard(2) 1 ");

ASN1.defineObjectIdentifier("id-PK-DH", "id-PK 1");
ASN1.defineObjectIdentifier("id-PK-ECDH", "id-PK 2");


ASN1.defineObjectIdentifier("id-TA", "bsi-de protocols(2) smartcard(2) 2");

ASN1.defineObjectIdentifier("id-TA-RSA", "id-TA 1");
ASN1.defineObjectIdentifier("id-TA-RSA-v1-5-SHA-1", "id-TA-RSA 1");
ASN1.defineObjectIdentifier("id-TA-RSA-v1-5-SHA-256", "id-TA-RSA 2");
ASN1.defineObjectIdentifier("id-TA-RSA-PSS-SHA-1", "id-TA-RSA 3");
ASN1.defineObjectIdentifier("id-TA-RSA-PSS-SHA-256", "id-TA-RSA 4");
ASN1.defineObjectIdentifier("id-TA-RSA-v1-5-SHA-512", "id-TA-RSA 5");
ASN1.defineObjectIdentifier("id-TA-RSA-PSS-SHA-512", "id-TA-RSA 6");

ASN1.defineObjectIdentifier("id-TA-ECDSA", "id-TA 2");
ASN1.defineObjectIdentifier("id-TA-ECDSA-SHA-1", "id-TA-ECDSA 1");
ASN1.defineObjectIdentifier("id-TA-ECDSA-SHA-224", "id-TA-ECDSA 2");
ASN1.defineObjectIdentifier("id-TA-ECDSA-SHA-256", "id-TA-ECDSA 3");
ASN1.defineObjectIdentifier("id-TA-ECDSA-SHA-384", "id-TA-ECDSA 4");
ASN1.defineObjectIdentifier("id-TA-ECDSA-SHA-512", "id-TA-ECDSA 5");


ASN1.defineObjectIdentifier("id-RI", "bsi-de protocols(2) smartcard(2) 5");

ASN1.defineObjectIdentifier("id-RI-DH", "id-RI 1");
ASN1.defineObjectIdentifier("id-RI-DH-SHA-1", "id-RI-DH 1");
ASN1.defineObjectIdentifier("id-RI-DH-SHA-224", "id-RI-DH 2");
ASN1.defineObjectIdentifier("id-RI-DH-SHA-256", "id-RI-DH 3");

ASN1.defineObjectIdentifier("id-RI-ECDH", "id-RI 2");
ASN1.defineObjectIdentifier("id-RI-ECDH-SHA-1", "id-RI-ECDH 1");
ASN1.defineObjectIdentifier("id-RI-ECDH-SHA-224", "id-RI-ECDH 2");
ASN1.defineObjectIdentifier("id-RI-ECDH-SHA-256", "id-RI-ECDH 3");


ASN1.defineObjectIdentifier("id-CI", "bsi-de protocols(2) smartcard(2) 6");


ASN1.defineObjectIdentifier("id-auxiliaryData", "bsi-de applications(3) mrtd(1) 4");
ASN1.defineObjectIdentifier("id-DateOfBirth", "id-auxiliaryData 1");
ASN1.defineObjectIdentifier("id-DateOfExpiry", "id-auxiliaryData 2");
ASN1.defineObjectIdentifier("id-CommunityID", "id-auxiliaryData 3");

ASN1.defineObjectIdentifier("id-extensions", "bsi-de applications(3) mrtd(1) 3");
ASN1.defineObjectIdentifier("id-description", "id-extensions 1");
ASN1.defineObjectIdentifier("id-plainFormat", "id-description 1");
ASN1.defineObjectIdentifier("id-htmlFormat", "id-description 2");
ASN1.defineObjectIdentifier("id-pdfFormat", "id-description 3");
ASN1.defineObjectIdentifier("id-sector", "id-extensions 2");

ASN1.defineObjectIdentifier("id-eIDSecurity", "bsi-de protocols(2) smartcard(2) 7");
ASN1.defineObjectIdentifier("id-PT", "bsi-de protocols(2) smartcard(2) 8");
 
ASN1.defineObjectIdentifier("id-roles", "bsi-de applications(3) mrtd(1) 2");

// From BSI/TG-03129
ASN1.defineObjectIdentifier("id-DefectList", "bsi-de applications(3) mrtd(1) 5");

ASN1.defineObjectIdentifier("id-AuthDefect", "id-DefectList 1");
ASN1.defineObjectIdentifier("id-CertRevoked", "id-AuthDefect 1");
ASN1.defineObjectIdentifier("id-CertReplaced", "id-AuthDefect 2");
ASN1.defineObjectIdentifier("id-ChipAuthKeyRevoked", "id-AuthDefect 3");
ASN1.defineObjectIdentifier("id-ActiveAuthKeyRevoked", "id-AuthDefect 4");
ASN1.defineObjectIdentifier("id-ActiveAuthKeyRevoked", "id-AuthDefect 4");

ASN1.defineObjectIdentifier("id-ePassportDefect", "id-DefectList 2");
ASN1.defineObjectIdentifier("id-ePassportDGMalformed", "id-ePassportDefect 1");
ASN1.defineObjectIdentifier("id-SODInvalid", "id-ePassportDefect 2");

ASN1.defineObjectIdentifier("id-eIDDefect", "id-DefectList 3");
ASN1.defineObjectIdentifier("id-eIDDGMalformed", "id-eIDDefect 1");
ASN1.defineObjectIdentifier("id-eIDIntegrity", "id-eIDDefect 2");

ASN1.defineObjectIdentifier("id-DocumentDefect", "id-DefectList 4");
ASN1.defineObjectIdentifier("id-CardSecurityMalformed", "id-DocumentDefect 1");
ASN1.defineObjectIdentifier("id-ChipSecurityMalformed", "id-DocumentDefect 2");
ASN1.defineObjectIdentifier("id-PowerDownReq", "id-DocumentDefect 3");

ASN1.defineObjectIdentifier("id-ListContentDescription", "bsi-de applications(3) mrtd(1) 6");


ASN1.defineObjectIdentifier("id-IS", "id-roles 1");
ASN1.defineObjectIdentifier("id-AT", "id-roles 2");
ASN1.defineObjectIdentifier("id-ST", "id-roles 3");

ASN1.defineObjectIdentifier("id-eID", "bsi-de applications(3) 2");
ASN1.defineObjectIdentifier("id-SecurityObject", "id-eID 1");

ASN1.defineObjectIdentifier("id-BlackList", "id-eID 2");


ASN1.defineObjectIdentifier("standardizedDomainParameter", "bsi-de algorithms(1) 2");


// From CSN 369791
ASN1.defineObjectIdentifier("id-csn-369791", "iso(1) member-body(2) cz(203) moi(7064) orpeg(1) cdbp(1) csn369791(369791)");
ASN1.defineObjectIdentifier("id-csn-369791-tls-client", "id-csn-369791 1");
ASN1.defineObjectIdentifier("id-csn-369791-tls-server", "id-csn-369791 2");

// ASN1.defineObjectIdentifier("", "");
