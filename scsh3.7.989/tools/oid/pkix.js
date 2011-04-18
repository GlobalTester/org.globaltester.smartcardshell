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
 *  Register of predefined object identifier for PKIX applications
 */


ASN1.defineObjectIdentifier("id-pkix", "iso(1) identified-organization(3) dod(6) internet(1) security(5) mechanisms(5) pkix(7)");

ASN1.defineObjectIdentifier("id-pe", "id-pkix 1");
ASN1.defineObjectIdentifier("id-qt", "id-pkix 2");
ASN1.defineObjectIdentifier("id-kp", "id-pkix 3");
ASN1.defineObjectIdentifier("id-ad", "id-pkix 48");

ASN1.defineObjectIdentifier("id-qt-cps", "id-qt 1");
ASN1.defineObjectIdentifier("id-qt-unotice", "id-qt 2");

ASN1.defineObjectIdentifier("id-ad-ocsp", "id-ad 1");
ASN1.defineObjectIdentifier("id-ad-caIssuers", "id-ad 2");
ASN1.defineObjectIdentifier("id-ad-timeStamping", "id-ad 3");
ASN1.defineObjectIdentifier("id-ad-caRepository", "id-ad 5");

ASN1.defineObjectIdentifier("id-at", "joint-iso-ccitt(2) ds(5) 4");

ASN1.defineObjectIdentifier("id-at-name", "id-at 41");
ASN1.defineObjectIdentifier("id-at-surname", "id-at  4");
ASN1.defineObjectIdentifier("id-at-givenName", "id-at 42");
ASN1.defineObjectIdentifier("id-at-initials", "id-at 43");
ASN1.defineObjectIdentifier("id-at-generationQualifier", "id-at 44");
ASN1.defineObjectIdentifier("id-at-commonName", "id-at 3");
ASN1.defineObjectIdentifier("id-at-localityName", "id-at 7");

ASN1.defineObjectIdentifier("id-at-stateOrProvinceName", "id-at 8");
ASN1.defineObjectIdentifier("id-at-organizationName", "id-at 10");
ASN1.defineObjectIdentifier("id-at-organizationalUnitName", "id-at 11");
ASN1.defineObjectIdentifier("id-at-title", "id-at 12");
ASN1.defineObjectIdentifier("id-at-dnQualifier", "id-at 46");
ASN1.defineObjectIdentifier("id-at-countryName", "id-at 6");
ASN1.defineObjectIdentifier("id-at-serialNumber", "id-at 5");

ASN1.defineObjectIdentifier("id-at-pseudonym", "id-at 65");
ASN1.defineObjectIdentifier("id-domainComponent", "0 9 2342 19200300 100 1 25");

ASN1.defineObjectIdentifier("pkcs-9", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) 9");
ASN1.defineObjectIdentifier("id-ce", "joint-iso-ccitt(2) ds(5) 29");
ASN1.defineObjectIdentifier("id-ce-authorityKeyIdentifier", "id-ce 35");
ASN1.defineObjectIdentifier("id-ce-subjectKeyIdentifier", "id-ce 14");
ASN1.defineObjectIdentifier("id-ce-keyUsage", "id-ce 15");
ASN1.defineObjectIdentifier("id-ce-privateKeyUsagePeriod", "id-ce 16");
ASN1.defineObjectIdentifier("id-ce-certificatePolicies", "id-ce 32");
ASN1.defineObjectIdentifier("anyPolicy", "id-ce-certificatePolicies 0");
ASN1.defineObjectIdentifier("id-ce-policyMappings", "id-ce 33");
ASN1.defineObjectIdentifier("id-ce-subjectAltName", "id-ce 17");
ASN1.defineObjectIdentifier("id-ce-issuerAltName", "id-ce 18");
ASN1.defineObjectIdentifier("id-ce-subjectDirectoryAttributes", "id-ce 9");
ASN1.defineObjectIdentifier("id-ce-basicConstraints", "id-ce 19");
ASN1.defineObjectIdentifier("id-ce-nameConstraints", "id-ce 30");
ASN1.defineObjectIdentifier("id-ce-policyConstraints", "id-ce 36");
ASN1.defineObjectIdentifier("id-ce-cRLDistributionPoints", "id-ce 31");
ASN1.defineObjectIdentifier("id-ce-extKeyUsage", "id-ce 37");

ASN1.defineObjectIdentifier("anyExtendedKeyUsage", "id-ce-extKeyUsage 0");

ASN1.defineObjectIdentifier("id-kp-serverAuth", "id-kp 1");
ASN1.defineObjectIdentifier("id-kp-clientAuth", "id-kp 2");
ASN1.defineObjectIdentifier("id-kp-codeSigning", "id-kp 3");
ASN1.defineObjectIdentifier("id-kp-emailProtection", "id-kp 4");
ASN1.defineObjectIdentifier("id-kp-timeStamping", "id-kp 8");
ASN1.defineObjectIdentifier("id-kp-OCSPSigning", "id-kp 9");

ASN1.defineObjectIdentifier("id-ce-inhibitAnyPolicy", "id-ce 54");

ASN1.defineObjectIdentifier("id-ce-freshestCRL", "id-ce 46");
ASN1.defineObjectIdentifier("id-pe-authorityInfoAccess", "id-pe 1");
ASN1.defineObjectIdentifier("id-pe-subjectInfoAccess", "id-pe 11");
ASN1.defineObjectIdentifier("id-ce-cRLNumber", "id-ce 20");
ASN1.defineObjectIdentifier("id-ce-issuingDistributionPoint", "id-ce 28");



ASN1.defineObjectIdentifier("id-ce-deltaCRLIndicator", "id-ce 27");

ASN1.defineObjectIdentifier("id-ce-cRLReasons", "id-ce 21");
ASN1.defineObjectIdentifier("id-ce-certificateIssuer", "id-ce 29");
ASN1.defineObjectIdentifier("id-ce-holdInstructionCode", "id-ce 23");
ASN1.defineObjectIdentifier("holdInstruction", "joint-iso-itu-t(2) member-body(2) us(840) x9cm(10040) 2");
ASN1.defineObjectIdentifier("id-holdinstruction-none", "holdInstruction 1");
ASN1.defineObjectIdentifier("id-holdinstruction-callissuer", "holdInstruction 2");
ASN1.defineObjectIdentifier("id-holdinstruction-reject", "holdInstruction 3");
ASN1.defineObjectIdentifier("id-ce-invalidityDate", "id-ce 24");


ASN1.defineObjectIdentifier("secp192r1", "iso(1) member-body(2) us(840) ansi-X9-62(10045) curves(3) prime(1) 1");
ASN1.defineObjectIdentifier("sect163k1", "iso(1) identified-organization(3) certicom(132) curve(0) 1");
ASN1.defineObjectIdentifier("sect163r2", "iso(1) identified-organization(3) certicom(132) curve(0) 15");
ASN1.defineObjectIdentifier("secp224r1", "iso(1) identified-organization(3) certicom(132) curve(0) 33");
ASN1.defineObjectIdentifier("sect233k1", "iso(1) identified-organization(3) certicom(132) curve(0) 26");
ASN1.defineObjectIdentifier("sect233r1", "iso(1) identified-organization(3) certicom(132) curve(0) 27");
ASN1.defineObjectIdentifier("secp256r1", "iso(1) member-body(2) us(840) ansi-X9-62(10045) curves(3) prime(1) 7");
ASN1.defineObjectIdentifier("sect283k1", "iso(1) identified-organization(3) certicom(132) curve(0) 16");
ASN1.defineObjectIdentifier("sect283r1", "iso(1) identified-organization(3) certicom(132) curve(0) 17");
ASN1.defineObjectIdentifier("secp384r1", "iso(1) identified-organization(3) certicom(132) curve(0) 34");
ASN1.defineObjectIdentifier("sect409k1", "iso(1) identified-organization(3) certicom(132) curve(0) 36");
ASN1.defineObjectIdentifier("sect409r1", "iso(1) identified-organization(3) certicom(132) curve(0) 37");
ASN1.defineObjectIdentifier("secp521r1", "iso(1) identified-organization(3) certicom(132) curve(0) 35");
ASN1.defineObjectIdentifier("sect571k1", "iso(1) identified-organization(3) certicom(132) curve(0) 38");
ASN1.defineObjectIdentifier("sect571r1", "iso(1) identified-organization(3) certicom(132) curve(0) 39");

ASN1.defineObjectIdentifier("id-ecDH", "iso(1) identified-organization(3) certicom(132) schemes(1) ecdh(12)");
ASN1.defineObjectIdentifier("id-ecMQV", "iso(1) identified-organization(3) certicom(132) schemes(1) ecmqv(13)");

ASN1.defineObjectIdentifier("id-md2", "iso(1) member-body(2) us(840) rsadsi(113549) digestAlgorithm(2) 2");
ASN1.defineObjectIdentifier("id-md5 ", "iso(1) member-body(2) us(840) rsadsi(113549) digestAlgorithm(2) 5");
ASN1.defineObjectIdentifier("id-sha1", "iso(1) identified-organization(3) oiw(14) secsig(3) algorithm(2) 26");
ASN1.defineObjectIdentifier("id-sha224", "joint-iso-itu-t(2) country(16) us(840) organization(1) gov(101) csor(3) nistalgorithm(4) hashalgs(2) 4");
ASN1.defineObjectIdentifier("id-sha256", "joint-iso-itu-t(2) country(16) us(840) organization(1) gov(101) csor(3) nistalgorithm(4) hashalgs(2) 1");
ASN1.defineObjectIdentifier("id-sha384", "joint-iso-itu-t(2) country(16) us(840) organization(1) gov(101) csor(3) nistalgorithm(4) hashalgs(2) 2");
ASN1.defineObjectIdentifier("id-sha512", "joint-iso-itu-t(2) country(16) us(840) organization(1) gov(101) csor(3) nistalgorithm(4) hashalgs(2) 3");

ASN1.defineObjectIdentifier("dhpublicnumber", "iso(1) member-body(2) us(840) ansi-x942(10046) number-type(2) 1");
ASN1.defineObjectIdentifier("id-keyExchangeAlgorithm", "joint-iso-itu-t(2) country(16) us(840) organization(1) gov(101) dod(2) infosec(1) algorithms(1) 22");

ASN1.defineObjectIdentifier("md2WithRSAEncryption", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-1(1) 2");
ASN1.defineObjectIdentifier("md5WithRSAEncryption", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-1(1) 4");
ASN1.defineObjectIdentifier("sha1WithRSAEncryption", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-1(1) 5");

ASN1.defineObjectIdentifier("id-dsa-with-sha1", "iso(1) member-body(2) us(840) x9-57(10040) x9algorithm(4) 3");
ASN1.defineObjectIdentifier("id-dsa-with-sha224", "joint-iso-ccitt(2) country(16) us(840) organization(1) gov(101) csor(3) algorithms(4) id-dsa-with-sha2(3) 1");
ASN1.defineObjectIdentifier("id-dsa-with-sha256", "joint-iso-ccitt(2) country(16) us(840) organization(1) gov(101) csor(3) algorithms(4) id-dsa-with-sha2(3) 2");

ASN1.defineObjectIdentifier("ecdsa-with-SHA1", "iso(1) member-body(2) us(840) ansi-X9-62(10045) signatures(4) 1");
ASN1.defineObjectIdentifier("ecdsa-with-SHA224", "iso(1) member-body(2) us(840) ansi-X9-62(10045) signatures(4) ecdsa-with-SHA2(3) 1");
ASN1.defineObjectIdentifier("ecdsa-with-SHA256", "iso(1) member-body(2) us(840) ansi-X9-62(10045) signatures(4) ecdsa-with-SHA2(3) 2");
ASN1.defineObjectIdentifier("ecdsa-with-SHA384", "iso(1) member-body(2) us(840) ansi-X9-62(10045) signatures(4) ecdsa-with-SHA2(3) 3");
ASN1.defineObjectIdentifier("ecdsa-with-SHA512", "iso(1) member-body(2) us(840) ansi-X9-62(10045) signatures(4) ecdsa-with-SHA2(3) 4");


ASN1.defineObjectIdentifier("CryptographicMessageSyntax", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-9(9) smime(16) modules(0) cms(1)");

ASN1.defineObjectIdentifier("id-alg-ESDH", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-9(9) smime(16) alg(3) 5");
ASN1.defineObjectIdentifier("id-alg-CMS3DESwrap", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-9(9) smime(16) alg(3) 6");
ASN1.defineObjectIdentifier("id-alg-CMSRC2wrap", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-9(9) smime(16) alg(3) 7");
ASN1.defineObjectIdentifier("des-ede3-cbc", "iso(1) member-body(2) us(840) rsadsi(113549) encryptionAlgorithm(3) 7");
ASN1.defineObjectIdentifier("rc2-cbc", "iso(1) member-body(2) us(840) rsadsi(113549) encryptionAlgorithm(3) 2");
ASN1.defineObjectIdentifier("hMAC-SHA1", "iso(1) identified-organization(3) dod(6) internet(1) security(5) mechanisms(5) 8 1 2");

ASN1.defineObjectIdentifier("id-ct-contentInfo", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-9(9) smime(16) ct(1) 6");
ASN1.defineObjectIdentifier("id-data", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs7(7) 1");
ASN1.defineObjectIdentifier("id-signedData", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs7(7) 2");
ASN1.defineObjectIdentifier("id-envelopedData", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs7(7) 3");
ASN1.defineObjectIdentifier("id-digestedData", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs7(7) 5");
ASN1.defineObjectIdentifier("id-encryptedData", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs7(7) 6");
ASN1.defineObjectIdentifier("id-ct-authData", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs-9(9) smime(16) ct(1) 2");
ASN1.defineObjectIdentifier("id-contentType", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs9(9) 3");
ASN1.defineObjectIdentifier("id-messageDigest", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs9(9) 4");
ASN1.defineObjectIdentifier("id-signingTime", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs9(9) 5");
ASN1.defineObjectIdentifier("id-countersignature", "iso(1) member-body(2) us(840) rsadsi(113549) pkcs(1) pkcs9(9) 6");

ASN1.defineObjectIdentifier("dhSinglePass_StdDH_SHA1KDF", "1.3.133.16.840.63.0.2");