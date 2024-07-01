/**
 *  ---------
 * |.##> <##.|  SmartCard-HSM Support Scripts
 * |#       #|
 * |#       #|  Copyright (c) 2011-2015 CardContact Software & System Consulting
 * |'##> <##'|  Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
 *  ---------
 *
 * Consult your license package for usage terms and conditions.
 *
 * @fileoverview Generate a key pair suitable for public key authentication
 */

requires("3.13.214");


File = require("scsh/file/File").File;
CVC = require("scsh/eac/CVC").CVC;
PublicKeyReference = require('scsh/eac/PublicKeyReference').PublicKeyReference;
SmartCardHSM = require("scsh/sc-hsm/SmartCardHSM").SmartCardHSM;
SmartCardHSMInitializer = require("scsh/sc-hsm/SmartCardHSM").SmartCardHSMInitializer;
SmartCardHSMKeySpecGenerator = require("scsh/sc-hsm/SmartCardHSM").SmartCardHSMKeySpecGenerator;
CAConnection = require("scsh/sc-hsm/CAConnection").CAConnection;
ManagePKA = require("scsh/sc-hsm/ManagePKA").ManagePKA;
HSMKeyStore = require("scsh/sc-hsm/HSMKeyStore").HSMKeyStore;
PKCS10Generator = require("scsh/x509/PKCS10Generator").PKCS10Generator;
PKIXCommon = require("scsh/x509/PKIXCommon").PKIXCommon;
DKEK = require("scsh/sc-hsm/DKEK").DKEK;



function KeyManager(card) {
	this.crypto = new Crypto();
	this.lastfile = GPSystem.mapFilename("", GPSystem.USR);
	this.initializedWithTransportPIN = false;

	this.loadPlugins();

	Card.setCardEventListener(this);

	if (card) {
		this.setCard(card);
	}
}

KeyManager.INITIALIZE = "Initialize Device";
KeyManager.GENERATE_PIN = "Generate Random PINs";
KeyManager.GENERATE_RSA_KEY = "Generate RSA Key";
KeyManager.ENTER_KEY_LABEL = "Enter Key Label";
KeyManager.GENERATE_ECC_KEY = "Generate ECC Key";
KeyManager.IMPORT_PKCS12 = "Import from PKCS#12 (Old)";
KeyManager.SELECT_KEY_SIZE = "Select Key Size";
KeyManager.SELECT_CURVE = "Select Curve";
KeyManager.DELETE_KEY = "Delete Key";
KeyManager.CREATE_DKEK_SHARE = "Create DKEK Share";
KeyManager.IMPORT_DKEK_SHARE = "Import DKEK Share";
KeyManager.GENERATE_AES_KEY = "Generate AES Key";
KeyManager.RSA_ALGORITHM_LIST = "<html><p>Possible algorithms for RSA key</p><ul><li>RSA_RAW(20)</li><li>RSA_DECRYPT_RAW(21)</li><li>RSA_DECRYPT_V15(22)</li><li>RSA_DECRYPT_OAEP(23)</li><li>RSA_V15_SHA1(31)</li><li>RSA_V15_SHA256(33)</li><li>RSA_V15_SHA512(35)</li><li>RSA_PSS(40)</li><li>RSA_PSS_SHA1(41)</li><li>RSA_PSS_SHA256(43)</li><li>RSA_PSS_SHA512(45)</li><li>DEFAULT_SIGN(A0)</li><li>WRAP(92)</li></ul>" +
				"<p>Enter as comma separated list of hexadecimal codes or names</p><p>Leave empty to allow all algorithms</p></html>";
KeyManager.ECC_ALGORITHM_LIST = "<html><p>Possible algorithms for ECC key</p><ul><li>ECDSA(70)</li><li>ECDSA_SHA1(71)</li><li>ECDSA_SHA1(72)</li><li>ECDSA_SHA256(73)</li><li>ECDSA_SHA384(74)</li><li>ECDSA_SHA512(75)</li><li>ECDH(80)</li><li>ECDH_AUTPUK(83)</li><li>ECDH_XKEK(84)</li><li>DEFAULT_SIGN(A0)</li><li>WRAP(92)</li></ul>" +
				"<p>Enter as comma separated list of hexadecimal codes or names</p><p>Leave empty to allow all algorithms</p></html>";
KeyManager.AES_ALGORITHM_LIST = "<html><p>Possible algorithms for AES key</p><ul><li>CBC_ENC(10)</li><li>CBC_DEC(11)</li><li>CMAC(18)</li><li>WRAP(92)</li><li>REPLACE(94)</li><li>DERIVE_SP800_56C(99)</li></ul>" +
				"<p>Enter as comma separated list of hexadecimal codes or names</p></html>";

KeyManager.BUG31 =	"<html><p>Version 3.1 of the SmartCard-HSM has a bug that prevents importing a RSA or ECC key with algorithm list.</p><br>" +
			"<p>A key generated with algorithm list can be exported, but the import into a SmartCard-HSM with 3.1 will fail.</p>" +
			"<p>Suggested workaround is to leave the algorithm list empty for keys that shall be exported.</p><br>" +
			"<p>The bug has been fixed in 3.2. A key exported with algorithm list in 3.1 can be imported in 3.2.</p></html>";

KeyManager.BUGAES =	"<html><p>Version 3.1 and 3.2 of the SmartCard-HSM have a bug that causes weak AES keys with little to no entropy (see #172 in CDN).</p><br>" +
			"<p>Do not use this version in a productive environment for generating AES keys. The bug has been fixed in 3.3.</p></html>";

KeyManager.GENERATING_KEY = "Generating key can take up to 60 seconds, please wait...";
KeyManager.GENERATING_KEY_DONE = "Key generated";
KeyManager.KEY_LABEL_EXISTS = "A key with that label does already exit";
KeyManager.INVALID_ALGORITHM_LIST = "Invalid algorithm list";

KeyManager.LOGIN_WITH_USER_PIN = "Login with User PIN";
KeyManager.LOGIN_WITH_USER_PIN_PAD = "Login with PIN PAD";
KeyManager.LOGIN_WITH_USER_BIO1 = "Login with Biometric Template 1";
KeyManager.LOGIN_WITH_USER_BIO2 = "Login with Biometric Template 2";
KeyManager.LOGOUT = "Logout";
KeyManager.ENTER_USER_PIN = "Enter User PIN";

KeyManager.USER_PIN = "User PIN";
KeyManager.TRANSPORT_PIN = "Transport PIN";
KeyManager.PUBLIC_KEY_AUTHENTICATION = "Public Key Authentication";
KeyManager.PUBLIC_KEY_AUTHENTICATION_OR_PIN = "Public Key Authentication or User PIN";
KeyManager.PUBLIC_KEY_AUTHENTICATION_AND_PIN = "Public Key Authentication and User PIN";
KeyManager.BIOMETRIC_MATCH_SOC = "Biometric Matching (SoC)";
KeyManager.BIOMETRIC_MATCH_SOC_OLD = "Biometric Matching (SoC-Old)";
KeyManager.BIOMETRIC_MATCH_NT = "Biometric Matching (NT)";

KeyManager.CHANGE_PIN = "Change User-PIN";
KeyManager.UNBLOCK_PIN = "Unblock User-PIN";
KeyManager.RESET_PIN = "Reset User-PIN";
KeyManager.CHANGE_SOPIN = "Change SO-PIN";
KeyManager.CHANGE_SOPIN_RANDOM = "Change SO-PIN to Random Value";

KeyManager.WITH_RRC = "Unblocking PIN with SO-PIN allowed";
KeyManager.WITH_RRC_PIN = "Resetting PIN with SO-PIN allowed";
KeyManager.WITHOUT_RRC = "Resetting and unblocking PIN with SO-PIN not allowed";

KeyManager.EXPORT_PUBLIC_KEY = "Export Public Key";
KeyManager.REGISTER_PUBLIC_KEY = "Register Public Key";
KeyManager.AUTHENTICATE_PUBLIC_KEY = "Authenticate with Public Key";
KeyManager.REPLACE_PUBLIC_KEY = "Replace Public Key";

KeyManager.EXPORT_KEY = "Export Key and Certificate";
KeyManager.IMPORT_KEY = "Import Key and Certificate";

KeyManager.GENERATE_PKCS10 = "Generate PKCS#10 Request";
KeyManager.IMPORT_CERTIFICATE = "Import Certificate";
KeyManager.EXPORT_CERTIFICATE = "Export Certificate";
KeyManager.DUMP_CERTIFICATE = "Dump Certificate";
KeyManager.DELETE_CACERTIFICATE = "Delete CA Certificate";

KeyManager.DKEK_SELECT = "Select Device Key Encryption scheme";
KeyManager.DKEK_NONE = "No DKEK";
KeyManager.DKEK_RANDOM_DKEK = "Randomly generated DKEK";
KeyManager.DKEK_SHARES = "DKEK Shares";
KeyManager.DKEK_NO_OF_SHARES = "Enter number of DKEK shares"
KeyManager.DKEK_KEY_DOMAINS = "Key Domains";
KeyManager.DKEK_NO_OF_KEY_DOMAINS = "Enter number of key domains"

KeyManager.CREATE_DKEK_DOMAIN = "Create DKEK Key Domain";
KeyManager.CREATE_XKEK_DOMAIN = "Create XKEK Key Domain";
KeyManager.ASSOCIATE_XKEK_DOMAIN = "Associate XKEK Key Domain";
KeyManager.DELETE_KEY_DOMAIN = "Delete Key Domain";
KeyManager.DELETE_KEK = "Delete Key Encryption Key";
KeyManager.SIGN_KEY_DOMAIN_MEMBERSHIP = "Group Signer Operations";
KeyManager.CREATE_EXCHANGE_KEY = "Create Exchange Key";
KeyManager.DERIVE_XKEK = "Derive XKEK";

KeyManager.EXPORT_ID = "Export Device ID";
KeyManager.REMOTE_UPDATE = "Remote Update";

KeyManager.SIGFORM_KDM = "Static key domain membership (>=3.4)";
KeyManager.SIGFORM_KDA = "Static key domain association (>=3.4)";
KeyManager.SIGFORM_KDM3 = "Key domain membership (<3.4)";

KeyManager.CURVES = [ "secp192r1", "secp256r1", "secp384r1", "secp521r1", "brainpoolP192r1", "brainpoolP224r1", "brainpoolP256r1", "brainpoolP256t1", "brainpoolP320r1", "brainpoolP384r1", "brainpoolP512r1", "secp192k1", "secp256k1" ];



KeyManager.prototype.detectPlugins = function(dir) {
//	print("dir: " + dir);
	var f = new File(dir);
	var l = f.list();
	for (var i = 0; i < l.length; i++) {
		if (l[i].search(/^\d\d\d-.*-plugin\.js$/) == 0) {
			var name = l[i];
//			print("Found : " + name);
			if (typeof(this.pluginMap[name]) == "undefined") {
				var p = { dir: dir, name: l[i] };
				this.plugins.push( p );
				this.pluginMap[name] = p;
			}
		}
	}
}



KeyManager.prototype.loadPlugins = function() {
	this.plugins = [];
	this.pluginMap = [];

	var udir = GPSystem.mapFilename("keymanager/plugins", GPSystem.USR);
	var sdir = GPSystem.mapFilename("keymanager/plugins", GPSystem.SYS);
	var cdir = GPSystem.mapFilename("plugins", GPSystem.CWD);

	if (cdir.equals(sdir)) {		// Run from Smart Card Shell
		this.detectPlugins(udir);
		this.detectPlugins(sdir);
	} else {
		this.detectPlugins(cdir);	// Run as copy in a workspace
	}

	this.plugins.sort( function(a,b) { return a.name.localeCompare(b.name) });

	for (var i = 0; i < this.plugins.length; i++) {
		var plugin = this.plugins[i];
//		print(plugin.name);

		var fn = plugin.dir + "/" + plugin.name;
		fn = fn.substr(0, fn.lastIndexOf("."));
//		print(fn);
		var exp = require(fn);
		plugin.instance = new exp.Plugin(this);
		GPSystem.trace("Loaded plug-in: " + plugin.instance);
	}
}



KeyManager.prototype.hasTokenManagementKey = function() {
	return this.managementToken && this.managementToken.tmk;
}



KeyManager.prototype.determineSOPIN = function(salt) {
	var soPIN = "3537363231383830";

	if (this.hasTokenManagementKey()) {
		this.kmksalt = salt;
		soPIN = this.managementToken.deriveSOPIN(this.id, this.kmksalt).toString(HEX)
	}

	this.devcfg = {
		soPIN : soPIN
	}
}



KeyManager.prototype.setCard = function(card) {
	this.sc = new SmartCardHSM(card);
	this.ks = new HSMKeyStore(this.sc);

	var devAutCert = this.sc.readBinary(SmartCardHSM.C_DevAut);
	this.certchain = SmartCardHSM.validateCertificateChain(this.crypto, devAutCert);

	if (this.certchain == null) {
		throw new GPError("KeyManager", GPError.CRYPTO_FAILED, 0, "Device authentication failed");
	}

//	this.sc.openSecureChannel(this.crypto, this.certchain.publicKey);

	print("");

	var str = "";
	var mem = this.sc.getFreeMemory();
	if (mem > -1) {
		var str = "Free memory " + mem + " byte";
		if (mem == 32767) {
			str += " (at least)";
		}
	}

	if (typeof(this.sc.major) != "undefined") {
		print("SmartCard-HSM " + this.sc.getVersionInfo() + "          " + str);
	}

	print("Issuer Certificate : " + this.certchain.dica);
	print("Device Certificate : " + this.certchain.devicecert);
	print("Default Key Domain : " + this.certchain.publicKey.getComponent(Key.ECC_QX).toString(HEX));

	this.provisioningURL = this.sc.getProvisioningURL();
	if (this.provisioningURL) {
		print("Provisioning URL   : " + this.provisioningURL);
	}

	var tmkkcv = this.sc.getTokenManagementKeyKCV();
	if (tmkkcv) {
		var str = tmkkcv.toString(HEX);
		var kmksalt = this.sc.getTokenManagementKeySalt();
		if (kmksalt) {
			str += " (" + kmksalt.toString(HEX) + ")";
		}
		print("Token Managmnt Key : " + str);
	}

	// Some cards have a CHR in the device certificate that exceeds 16 bytes
	var chr = this.certchain.devicecert.getCHR();
	if (chr.toString().length > 16) {
		this.chr = new PublicKeyReference(chr.toString().substr(0, 16));
	} else {
		this.chr = chr;
	}

	this.id = "/" + this.certchain.dica.getCAR().getHolder() + "/" + this.certchain.dica.getCHR().getHolder() + "/" + chr.getHolder();

	this.managePKA = new ManagePKA(this.sc, chr.getBytes());

	this.profileName = GPSystem.mapFilename(chr.getHolder() + ".profile.json", GPSystem.USR);

	this.hasProfile = false;			// We have a profile file for this device
	this.readProfile();

	if (!this.hasProfile) {
		this.determineSOPIN(kmksalt);
	}

	this.authenticationState = this.sc.queryUserPINStatus();

	this.createOutline();
}



KeyManager.prototype.cardInserted = function(readerName) {
	if (!this.autoInsert) {
		if (Dialog.prompt("Automatically access card with Key Manager ?")) {
			this.autoInsert = true;
		} else {
			Card.setCardEventListener();		// Remove event listener
			return;
		}
	}
	GPSystem.trace("Inserted: " + readerName);
	var card = new Card(readerName);
	this.setCard(card);
}



KeyManager.prototype.cardRemoved = function(readerName) {
	GPSystem.trace("Removed: " + readerName);
	this.view = new OutlineNode("Please insert card");
	this.view.show();
}



KeyManager.prototype.populateAuthentication = function() {
	this.authview = new OutlineNode("User Authentication");
	this.authview.setUserObject(this);
	this.view.insert(this.authview);

	var pinsw = this.sc.queryUserPINStatus();
	this.updateAuthenticationStatus(pinsw);

	this.populatePKAStatus();

	this.sopinview = new OutlineNode("SO-PIN");
	this.sopinview.setUserObject(this);
	this.view.insert(this.sopinview);

	this.updateSOPINStatus();

	pinsw = this.sc.queryPINStatus(0x85);
	if ((pinsw != 0x6A88) && (pinsw != 0x6A86)) {
		this.bio1view = new OutlineNode(SmartCardHSM.describePINStatus(pinsw, "Biometric Feature 1"));
		this.bio1view.setUserObject(this);
		this.bio1view.setContextMenu( [ KeyManager.LOGIN_WITH_USER_BIO1, KeyManager.LOGOUT ] );
		this.view.insert(this.bio1view);
	}

	pinsw = this.sc.queryPINStatus(0x86);
	if ((pinsw != 0x6A88) && (pinsw != 0x6A86)) {
		this.bio2view = new OutlineNode(SmartCardHSM.describePINStatus(pinsw, "Biometric Feature 2"));
		this.bio2view.setUserObject(this);
		this.bio2view.setContextMenu( [ KeyManager.LOGIN_WITH_USER_BIO2, KeyManager.LOGOUT ] );
		this.view.insert(this.bio2view);
	}

}



KeyManager.prototype.changedAuthenticationStatus = function(sw) {
	if (((this.authenticationState == 0x9000) && (sw != 0x9000)) ||
	    ((this.authenticationState != 0x9000) && (sw == 0x9000))) {
		this.authenticationState = sw;
		this.createOutline();
	} else {
		this.authenticationState = sw;
		this.updateAuthenticationStatus(sw);
	}
}



KeyManager.prototype.populatePKAStatus = function() {
	if (this.managePKA.isActive()) {
		this.pkaview = new OutlineNode("Public Key Authentication");
		this.pkaview.setUserObject(this);

		this.view.insert(this.pkaview);

		if (this.managePKA.canEnumeratePublicKeys()) {
			for (var i = 0; i < this.managePKA.getNumberOfPublicKeys(); i++) {
				var node = new OutlineNode("");
				node.setUserObject(this);
				node.id = i;
				node.setContextMenu( [ KeyManager.REPLACE_PUBLIC_KEY ] );
				this.pkaview.insert(node);
			}
		}
		this.updatePKAStatus();
	}
}



KeyManager.prototype.updatePKAStatus = function() {
	var str = this.managePKA.describeStatus();
	if (this.managePKA.getMissingPublicKeys()) {
		var contextMenu = [ KeyManager.REGISTER_PUBLIC_KEY ];
	} else {
		var contextMenu = [ KeyManager.AUTHENTICATE_PUBLIC_KEY, KeyManager.LOGOUT ];
	}
	this.pkaview.setContextMenu(contextMenu);
	this.pkaview.setLabel(str);

	if (this.pkaview.childs.length > 0) {
		var pklist = this.managePKA.enumeratePublicKeys();
		for (var i = 0; i < pklist.length; i++) {
			var pk = pklist[i];
			switch(pk.status) {
				case ManagePKA.KEY_PRESENT:
					var str = pk.chr.getHolder().toString(ASCII);
					break;
				case ManagePKA.KEY_NOT_FOUND:
					var str = "No key registered yet";
					break;
				case ManagePKA.KEY_ALREADY_AUTHENTICATED:
					var str = pk.chr.getHolder().toString(ASCII) + " (authenticated)";
					break;
			}

			var node = this.pkaview.childs[i];
			node.setLabel(str);
		}
	}
}



KeyManager.prototype.updateAuthenticationStatus = function(sw) {
	var str = SmartCardHSM.describePINStatus(sw, "User PIN");

	if (sw == 0x9000) {
		var contextMenu = [ KeyManager.LOGOUT, KeyManager.CHANGE_PIN ];
	} else if (sw == 0x6A88) {
		var contextMenu = [ ];
	} else if (sw == 0x6983) {
		var contextMenu = [ ];
		if (this.sc.isResetRetryCounterEnabled()) {
			contextMenu.push(KeyManager.UNBLOCK_PIN);
			if (this.sc.isPINResetEnabled()) {
				contextMenu.push(KeyManager.RESET_PIN);
			}
		}
	} else {
		var contextMenu = [ KeyManager.LOGIN_WITH_USER_PIN,
					KeyManager.LOGIN_WITH_USER_PIN_PAD,
					KeyManager.CHANGE_PIN,
					KeyManager.UNBLOCK_PIN,
					KeyManager.RESET_PIN,
					KeyManager.LOGOUT
 					];
	}

	this.authview.setContextMenu(contextMenu);
	this.authview.setLabel(str);
}



KeyManager.prototype.updateSOPINStatus = function() {
	var sopinsw = this.sc.queryInitializationCodeStatus();
	var str = SmartCardHSM.describePINStatus(sopinsw, "SO PIN");
	this.sopinview.setContextMenu([ KeyManager.CHANGE_SOPIN ]);
	this.sopinview.setLabel(str);
}



KeyManager.prototype.updateBioMatchStatus = function() {
	if (this.bio1view) {
		var sw = this.sc.queryPINStatus(0x85);
		var str = SmartCardHSM.describePINStatus(sw, "Biometric Feature 1");
		this.bio1view.setLabel(str);
	}

	if (this.bio2view) {
		var sw = this.sc.queryPINStatus(0x86);
		var str = SmartCardHSM.describePINStatus(sw, "Biometric Feature 2");
		this.bio2view.setLabel(str);
	}
}



KeyManager.prototype.populateKeyDomains = function() {
	var kdid = 0;
	this.keydomains = [];

	do	{
		var status = this.sc.queryKeyDomainStatus(kdid);
		if ((status.sw == 0x6D00) || (status.sw == 0x6A86)) {
			return;
		}
		var node = new OutlineNode("Key Domain");
		node.kdid = kdid;
		node.setUserObject(this);
		this.view.insert(node);
		var dom = { kdid: kdid, status: status, node: node };
		this.keydomains.push(dom);
		this.updateKeyDomainStatus(kdid, status);

		for (var i = 0; i < this.plugins.length; i++) {
			var plugin = this.plugins[i].instance;
			if (plugin.addKeyDomainInformation) {
				plugin.addKeyDomainInformation(dom);
			}
		}

		kdid++;
	} while ((status.sw == 0x9000) || (status.sw == 0x6A88));
}



KeyManager.prototype.updateKeyDomainStatus = function(kdid, status) {
	var dom = this.keydomains[kdid];
	var node = dom.node;
	dom.status = status;

	var contextMenu = [ ];

	if (status.sw == 0x6A88) {
		str = "Key domain " + kdid + " not created";
		contextMenu.push( KeyManager.CREATE_DKEK_DOMAIN );
		contextMenu.push( KeyManager.CREATE_XKEK_DOMAIN );
	} else {
		if (this.authenticationState == 0x9000) {
			var contextMenu = [ KeyManager.GENERATE_RSA_KEY, KeyManager.GENERATE_ECC_KEY, KeyManager.GENERATE_AES_KEY ];
		}

		if (typeof(status.keyDomain) != "undefined" ) {
			str = "XKEK with KCV " + status.kcv.toString(HEX) + " in key domain " + status.keyDomain.toString(HEX);
			contextMenu.push( KeyManager.CREATE_EXCHANGE_KEY, KeyManager.ASSOCIATE_XKEK_DOMAIN );
		} else {
			if (status.outstanding == 0) {
				str = "DKEK with KCV " + status.kcv.toString(HEX);
			} else {
				str = "DKEK set-up in progress with " + status.outstanding + " of " + status.shares + " shares missing";
				contextMenu.push( KeyManager.IMPORT_DKEK_SHARE );
			}
		}

		contextMenu.push( KeyManager.DELETE_KEK );
		contextMenu.push( KeyManager.DELETE_KEY_DOMAIN );
	}


	for (var i = 0; i < this.plugins.length; i++) {
		var plugin = this.plugins[i].instance;
		if (plugin.addKeyDomainContextMenu) {
			plugin.addKeyDomainContextMenu(contextMenu, this.authenticationState, dom);
		}
	}

	dom.node.setContextMenu(contextMenu);
	dom.node.setLabel(str);
}



KeyManager.prototype.createDKEKDomain = function(node) {
	var shares = 0;
	var str = Dialog.prompt(KeyManager.DKEK_NO_OF_SHARES, "1");
	if (str == null) {
		return;
	}

	var shares = parseInt(str);
	var status = this.sc.createDKEKKeyDomain(node.kdid, shares);
	if (status.sw == 0x9000) {
		this.updateKeyDomainStatus(node.kdid, status);
	} else {
		print("Creating DKEK key domain failed with SW1/2=" + status.sw.toString(HEX));
	}
}



KeyManager.prototype.createXKEKDomain = function(node) {
	var fname = Dialog.prompt("Enter name for file containing key domain membership", this.lastfile, null, "*.kdm");

	if (fname == null) {
		return null;
	}

	var f = new File(fname);
	var chain = f.readAllAsBinary();
	f.close();

	if (chain.byteAt(0) != 0x30) {
		throw new GPError("KeyManager", GPError.INVALID_DATA, 0, "File does not contain a key domain membership");
	}

	var a = new ASN1(chain);
//	print(a);
	var oid = new ByteString("CardContact 4 2 1", OID);
	assert(a.get(0).value.equals(oid), "Invalid file format");
	var groupkey = new CVC(a.find(0x63).get(0));
	var devcert = new CVC(a.find(0x62).get(0));
	var dicacert = new CVC(a.find(0x61).get(0));
	var kdm = a.find(0x53);
	if (kdm == null) {
		var kdm = a.find(0x54).getBytes();
	} else {
		kdm = kdm.getBytes();
	}

	var root = SmartCardHSM.rootCerts[dicacert.getCAR()];
	assert(dicacert.verifyWithCVC(this.crypto, root));
	assert(devcert.verifyWith(this.crypto, dicacert.getPublicKey(root.getPublicKey()), dicacert.getPublicKeyOID()));
	assert(groupkey.verifyATWith(this.crypto, devcert.getPublicKey(root.getPublicKey()), devcert.getPublicKeyOID()));

	this.lastfile = fname;

	this.sc.verifyCertificate(dicacert);
	this.sc.verifyCertificate(devcert);

	var status = this.sc.createXKEKKeyDomain(node.kdid, groupkey, kdm);

	if (status.sw == 0x9000) {
		this.updateKeyDomainStatus(node.kdid, status);
	} else {
		print("Creating XKEK key domain failed with SW1/2=" + status.sw.toString(HEX));
	}
}



KeyManager.prototype.associateXKEKDomain = function(node) {
	var fname = Dialog.prompt("Enter name for file containing key domain association", this.lastfile, null, "*.kda");

	if (fname == null) {
		return null;
	}

	var f = new File(fname);
	var chain = f.readAllAsBinary();
	f.close();

	if (chain.byteAt(0) != 0x30) {
		throw new GPError("KeyManager", GPError.INVALID_DATA, 0, "File does not contain a key domain association");
	}

	var a = new ASN1(chain);
//	print(a);
	var oid = new ByteString("CardContact 4 4 1", OID);
	assert(a.get(0).value.equals(oid), "Invalid file format");
	var groupkey = new CVC(a.find(0x63).get(0));
	var devcert = new CVC(a.find(0x62).get(0));
	var dicacert = new CVC(a.find(0x61).get(0));
	var assdomainuid = a.find(0x51).getBytes();
	var kda = a.find(0x56).getBytes();

	var root = SmartCardHSM.rootCerts[dicacert.getCAR()];
	assert(dicacert.verifyWithCVC(this.crypto, root));
	assert(devcert.verifyWith(this.crypto, dicacert.getPublicKey(root.getPublicKey()), dicacert.getPublicKeyOID()));
	assert(groupkey.verifyATWith(this.crypto, devcert.getPublicKey(root.getPublicKey()), devcert.getPublicKeyOID()));

	this.lastfile = fname;

	this.sc.verifyCertificate(dicacert);
	this.sc.verifyCertificate(devcert);

	var status = this.sc.associateXKEKKeyDomain(node.kdid, groupkey, assdomainuid, kda);

	if (status.sw == 0x9000) {
		this.updateKeyDomainStatus(node.kdid, status);
		print("Association established");
	} else {
		print("Associating XKEK key domain failed with SW1/2=" + status.sw.toString(HEX));
	}
}



KeyManager.prototype.groupSignerOperation = function(node) {
	var sigform = [ KeyManager.SIGFORM_KDM, KeyManager.SIGFORM_KDA, KeyManager.SIGFORM_KDM3 ];
	var format = Dialog.prompt("Select signature format", sigform[0], sigform);

	if (format == null) {
		return;
	}

	if (format == KeyManager.SIGFORM_KDA) {
		this.signKeyDomainAssociation(node, format);
	} else {
		this.signKeyDomainMembership(node, format);
	}
}



KeyManager.prototype.signKeyDomainMembership = function(node, format) {

	var fname = Dialog.prompt("Enter file name for device id", this.lastfile, null, "*.id");

	if (fname == null) {
		return null;
	}

	var f = new File(fname);
	var chain = f.readAllAsBinary();
	f.close();

	if (chain.byteAt(0) != 0x30) {
		throw new GPError("KeyManager", GPError.INVALID_DATA, 0, "File does not contain a device id");
	}

	var a = new ASN1(chain);
//	print(a);
	var oid = new ByteString("CardContact 4 1 1", OID);
	assert(a.get(0).value.equals(oid), "Invalid file format");
	var devcert = new CVC(a.find(0x62).get(0));
	var dicacert = new CVC(a.find(0x61).get(0));

	var root = SmartCardHSM.rootCerts[dicacert.getCAR()];
	assert(dicacert.verifyWithCVC(this.crypto, root));
	assert(devcert.verifyWith(this.crypto, dicacert.getPublicKey(root.getPublicKey()), dicacert.getPublicKeyOID()));

	this.lastfile = fname;

	var cert = new CVC(node.cert);
	var pk = cert.getPublicKey();
	var domainuid = pk.getComponent(Key.ECC_QX);

	var ok = Dialog.prompt("Add device " + devcert.getCHR() + " to key domain " + domainuid.toString(HEX) + " (Cancel for No) ?");
	if (ok == null) {
		print("User abort");
		return;
	}

	var key = node.parent.key;

	if (format == KeyManager.SIGFORM_KDM3) {
		var input = devcert.getPublicKey().getComponent(Key.ECC_QX);
	} else {
		var input = ByteString.valueOf(0x54).concat(devcert.getPublicKey().getComponent(Key.ECC_QX));
	}

	print("Input : " + input);

	var crypto = this.sc.getCrypto();

	var signature = crypto.sign(key, Crypto.ECDSA_SHA256, input);
	signature = CVC.unwrapSignature(signature, key.getSize() + 7 >> 3);

	if (format == KeyManager.SIGFORM_KDM3) {
		signature = new ASN1(0x53, signature);
	} else {
		signature = new ASN1(0x54, signature);
	}

	var asn = new ASN1(ASN1.SEQUENCE,
			new ASN1(ASN1.OBJECT_IDENTIFIER, new ByteString("CardContact 4 2 1", OID)),
			new ASN1(0x61, this.certchain.dica.getASN1()),
			new ASN1(0x62, this.certchain.devicecert.getASN1()),
			new ASN1(0x63, cert.getASN1()),
			signature
	);

//	print(asn);

	var fname = fname.substr(0, fname.lastIndexOf(".")) + "-" + domainuid.toString(HEX) + ".kdm";

	var f = new File(fname);
	f.writeAll(asn.getBytes());
	f.close();
	print("Key Domain Membership written to " + fname);
}



KeyManager.prototype.signKeyDomainAssociation = function(node, format) {

	var fname = Dialog.prompt("Enter file name for any key domain membership", this.lastfile, null, "*.kdm");

	if (fname == null) {
		return null;
	}

	var f = new File(fname);
	var chain = f.readAllAsBinary();
	f.close();

	if (chain.byteAt(0) != 0x30) {
		throw new GPError("KeyManager", GPError.INVALID_DATA, 0, "File does not contain a device id");
	}

	var a = new ASN1(chain);
//	print(a);
	var oid = new ByteString("CardContact 4 2 1", OID);
	assert(a.get(0).value.equals(oid), "Invalid file format");
	var gscert = new CVC(a.find(0x63).get(0));
	var devcert = new CVC(a.find(0x62).get(0));
	var dicacert = new CVC(a.find(0x61).get(0));
	var root = SmartCardHSM.rootCerts[dicacert.getCAR()];
	assert(dicacert.verifyWithCVC(this.crypto, root));
	assert(devcert.verifyWith(this.crypto, dicacert.getPublicKey(root.getPublicKey()), dicacert.getPublicKeyOID()));
	assert(gscert.verifyATWith(this.crypto, devcert.getPublicKey(root.getPublicKey()), devcert.getPublicKeyOID()));

	this.lastfile = fname;

	var cert = new CVC(node.cert);
	var pk = cert.getPublicKey();
	var domainuid = pk.getComponent(Key.ECC_QX);
	var pk = gscert.getPublicKey();
	var assdomainuid = pk.getComponent(Key.ECC_QX);

	var ok = Dialog.prompt("Associate key domain " + assdomainuid.toString(HEX) + " with this key domain " + domainuid.toString(HEX) + " (Cancel for No) ?");
	if (ok == null) {
		print("User abort");
		return;
	}

	var key = node.parent.key;

	var input = ByteString.valueOf(0x56).concat(assdomainuid);

	print("Input : " + input);

	var crypto = this.sc.getCrypto();

	var signature = crypto.sign(key, Crypto.ECDSA_SHA256, input);
	signature = CVC.unwrapSignature(signature, key.getSize() + 7 >> 3);

	signature = new ASN1(0x56, signature);

	var asn = new ASN1(ASN1.SEQUENCE,
			new ASN1(ASN1.OBJECT_IDENTIFIER, new ByteString("CardContact 4 4 1", OID)),
			new ASN1(0x61, this.certchain.dica.getASN1()),
			new ASN1(0x62, this.certchain.devicecert.getASN1()),
			new ASN1(0x63, cert.getASN1()),
			new ASN1(0x51, assdomainuid),
			signature
	);

	print(asn);

	var fname = fname.substr(0, fname.lastIndexOf("/") + 1) + assdomainuid.toString(HEX) + "-" + domainuid.toString(HEX) + ".kda";

	var f = new File(fname);
	f.writeAll(asn.getBytes());
	f.close();
	print("Key Domain Association written to " + fname);
}



KeyManager.prototype.createExchangeKey = function(node) {
	var kdid = node.kdid;

	var dom = new Key();
	dom.setComponent(Key.ECC_CURVE_OID, new ByteString("brainpoolP256r1", OID));

	var label = Dialog.prompt(KeyManager.ENTER_KEY_LABEL, "");
	if (label == null) {
		return;
	}

	if (this.sc.getKey(label)) {
		Dialog.prompt(KeyManager.KEY_LABEL_EXISTS);
		return;
	}

	var spec = new SmartCardHSMKeySpecGenerator(Crypto.EC, dom);

	spec.setKeyDomain(kdid);
	spec.setAlgorithms(ByteString.valueOf(SmartCardHSM.ALG_ECDHXKEK));
	spec.setCHR(this.chr);
	spec.setInnerCAR(this.chr);

	print(KeyManager.GENERATING_KEY);
	var req = this.ks.generateKeyPair(label, spec);
	this.ks.storeEndEntityCertificate(label, req);

	print(KeyManager.GENERATING_KEY_DONE);
	this.createOutline();
}



KeyManager.prototype.deriveXKEK = function(node) {
	var fname = Dialog.prompt("Enter name for file containing peer public key", this.lastfile, null, "*.pka");

	if (fname == null) {
		return null;
	}

	var f = new File(fname);
	var chain = f.readAllAsBinary();
	f.close();

	if (chain.byteAt(0) != 0x30) {
		throw new GPError("KeyManager", GPError.INVALID_DATA, 0, "File does not contain an authenticated public key");
	}

	var a = new ASN1(chain);
	print(a);
	var oid = new ByteString("CardContact 4 3 1", OID);
	assert(a.get(0).value.equals(oid), "Invalid file format");
	var peerkey = new CVC(a.find(0x63).get(0));
	var devcert = new CVC(a.find(0x62).get(0));
	var dicacert = new CVC(a.find(0x61).get(0));

	var root = SmartCardHSM.rootCerts[dicacert.getCAR()];
	assert(dicacert.verifyWithCVC(this.crypto, root));
	assert(devcert.verifyWith(this.crypto, dicacert.getPublicKey(root.getPublicKey()), dicacert.getPublicKeyOID()));
	assert(peerkey.verifyATWith(this.crypto, devcert.getPublicKey(root.getPublicKey()), devcert.getPublicKeyOID()));

	this.lastfile = fname;

	this.sc.verifyCertificate(dicacert);
	this.sc.verifyCertificate(devcert);

	this.sc.deriveXKEK(node.parent.key.getId(), peerkey, new ByteString("DerivationParam", ASCII));

	var status = this.sc.queryKeyDomainStatus(node.parent.parent.kdid);
	this.updateKeyDomainStatus(node.parent.parent.kdid, status);
}



KeyManager.prototype.deleteKEK = function(node) {
	var status = this.sc.deleteKEK(node.kdid);
	if (status.sw == 0x9000) {
		this.updateKeyDomainStatus(node.kdid, status);
	} else {
		print("Deleting KEK failed with SW1/2=" + status.sw.toString(HEX));
	}
}



KeyManager.prototype.deleteDomain = function(node) {
	var status = this.sc.deleteKeyDomain(node.kdid);
	this.updateKeyDomainStatus(node.kdid, { sw: 0x6A88 });

	for (var i = 0; i < this.plugins.length; i++) {
		var plugin = this.plugins[i].instance;
		if (plugin.deleteKeyDomain) {
			plugin.deleteKeyDomain(node);
		}
	}
}



KeyManager.prototype.login = function() {
	var pin = Dialog.prompt(KeyManager.ENTER_USER_PIN, this.devcfg.userPIN ? this.devcfg.userPIN : "*");
	if (pin == null) {
		return;
	}

	var sw = this.sc.verifyUserPIN(new ByteString(pin, ASCII));

	if (sw == 0x6700) {
		print("Wrong PIN length, try again");
	} else {
		this.changedAuthenticationStatus(sw);
	}
}



KeyManager.prototype.loginPinPAD = function() {
	var cs = this.sc.getNativeCardService();
	cs.useClassThreePinPad(true);

	var sw = this.sc.verifyUserPIN();
	this.changedAuthenticationStatus(sw);
}



KeyManager.prototype.loginBioMatch = function(p2) {
	this.sc.card.sendSecMsgApdu(Card.ALL, 0x80, 0x20, 0x00, p2, new ByteString("7F2400", HEX));
//	this.sc.card.sendSecMsgApdu(Card.ALL, 0x80, 0x20, 0x00, p2, new ByteString("7F 2E 81 93 81 81 90 24 00 5F 15 08 61 07 27 68 17 2E 40 12 3D 40 33 3F 78 3E 48 98 4B 4A 76 1F 50 A1 44 5C B5 0F 5D 48 3A 5E 74 2D 5F 73 16 60 6F 07 62 4C 00 63 6F 27 63 72 63 64 B3 4A 69 95 48 73 B4 31 7E 70 14 88 91 19 8C 8E 2E 8E 6F 35 96 71 2B 97 6E 01 98 77 62 99 77 4B 9A 76 3D 9B 74 10 9E 55 19 A3 92 37 A4 B1 1C A5 50 17 AB 57 25 AE 4E 38 AE 72 47 AE 55 19 B4 5B 24 B5 51 3F B6 5C 2E B9 86 53 BA 9C 1B BC 5D 33 BD 61 4D BD 5D 24 BF 9D 1E C3 60", HEX));
	var sw = this.sc.queryUserPINStatus();
	this.changedAuthenticationStatus(sw);
	this.updateBioMatchStatus();
}



KeyManager.prototype.logout = function() {
	this.sc.logout();
	var card = new Card(_scsh3.reader);
	this.setCard(card);
}



KeyManager.prototype.promptNewPIN = function(pintype, usedefault) {
	switch(pintype) {
		case 1:
			var name = "SO-PIN";
			var pin = this.devcfg.soPIN ? this.devcfg.soPIN : usedefault ? "3537363231383830" : "*";
			break;
		case 2:
			var name = "User-PIN";
			var pin = this.devcfg.userPIN ? this.devcfg.userPIN : usedefault ? "648219" : "*";
			break;
		case 3:
			var name = "Transport-PIN";
			var pin = this.devcfg.transportPIN ? this.devcfg.transportPIN : usedefault ? "835212" : "*";
			break;
		default:
			throw new Error("Invalid argument");
	}

	while(true) {
		var oldpin = pin == "*" ? "" : pin;
		pin = Dialog.prompt("Enter new " + name + " (leave empty to generate random PIN)", pin);
		if (pin == null) {
			return;
		}
		if (pin.length == 0) {
			var rnd = this.sc.generateRandom(8);
			if (pintype == 1) {
				pin = rnd.toString(HEX);
			} else {
				pin = this.decimalize(rnd.bytes(0,8), 6);
			}
			continue;
		}
		if (pintype == 1) {
			var valid = false;
			try	{
				new ByteString(pin, HEX);
				valid = true;
			}
			catch(e) {};

			if (!valid || pin.length != 16) {
				var ok = Dialog.prompt("SO-PIN must be a 16 digit hexadecimal string. Try again ?");
				if (ok == null) {
					return;
				}
				continue;
			}
		} else {
			if ((pin.length < 6) || (pin.length > 16)) {
				var ok = Dialog.prompt("PIN must be between 6 and 16 characters. Try again ?");
				if (ok == null) {
					return;
				}
				continue;
			}
		}

		if (!pin.equals(oldpin)) {
			var pin2 = Dialog.prompt("Repeat new " + name, "*");
			if (pin2 == null) {
				return;
			}

			if (!pin.equals(pin2)) {
				var ok = Dialog.prompt("First new PIN does not match second new PIN. Try again ?");
				if (ok == null) {
					return;
				}
				pin = "*";
				continue;
			}
		}
		break;
	}

	return pin;
}



KeyManager.prototype.changeSOPIN = function(sopin, random) {
	var def = this.devcfg.soPIN ? this.devcfg.soPIN : "*";

	var str = Dialog.prompt("Enter current SO-PIN", def);

	if (str == null) {
		return;
	}

	var oldpin = str;

	newpin = this.promptNewPIN(1, false);

	if (!newpin) {
		return;
	}

	try	{
		this.sc.changeInitializationCode(new ByteString(oldpin, HEX), new ByteString(newpin, HEX));
		print("SO-PIN changed");

		if (this.hasProfile) {
			if (Dialog.prompt("Update profile on disk with changed SO-PIN (Cancel for No) ?")) {
				if (this.devcfg.soPIN) {
					this.devcfg.soPIN = newpin;
				}
			} else {
				delete this.devcfg.soPIN;
			}
			this.writeProfile();
		} else {
			if (Dialog.prompt("Keep a profile on disk to save the SO-PIN (Cancel for No) ?")) {
				this.devcfg.soPIN = newpin;
				this.writeProfile();
			}
		}
	}
	catch(e) {
		print("PIN change failed : " + e);
	}

	this.updateSOPINStatus();
}



KeyManager.prototype.changePIN = function() {
	var def = this.devcfg.userPIN ? this.devcfg.userPIN : "*";

	var str = Dialog.prompt("Enter current PIN", def);

	if (str == null) {
		return;
	}

	var oldpin = str;

	newpin = this.promptNewPIN(2, false);

	if (!newpin) {
		return;
	}

	try	{
		this.sc.changeUserPIN(new ByteString(oldpin, UTF8), new ByteString(newpin, UTF8));
		var sw = this.sc.card.SW;
		print("PIN changed");

		if (this.hasProfile) {
			if (Dialog.prompt("Update profile on disk with changed PIN (Cancel for No) ?")) {
				if (this.devcfg.userPIN) {
					this.devcfg.userPIN = newpin;
				}
			} else {
				delete this.devcfg.userPIN;
			}
			this.writeProfile();
		}
	}
	catch(e) {
		print("PIN change failed : " + e);
		var sw = this.sc.queryUserPINStatus();
	}

	this.changedAuthenticationStatus(sw);
}



KeyManager.prototype.unblockPIN = function(withReset) {
	var sopin = Dialog.prompt("Enter Initialization Code (SO-PIN)", this.devcfg.soPIN ? this.devcfg.soPIN : "*");

	if (sopin == null) {
		return;
	}

	sopin = new ByteString(sopin, HEX);
	pin = null;

	if (withReset) {
		var newpin = this.promptNewPIN(2, false);

		if (newpin == null) {
			return;
		}

		pin = new ByteString(newpin, UTF8);
	}

	try	{
		this.sc.unblockUserPIN(sopin, pin);
		print(withReset ? "PIN reset" : "PIN unblocked");

		if (this.hasProfile && withReset) {
			if (Dialog.prompt("Update profile on disk with changed PIN (Cancel for No) ?")) {
				this.devcfg.userPIN = newpin;
			} else {
				delete this.devcfg.userPIN;
			}
			this.writeProfile();
		}
	}
	catch(e) {
		if (this.sc.card.SW == 0x6D00) {
			print("PIN unblock not allowed");
		} else {
			print("PIN unblock failed : " + e);
		}
	}

	this.updateSOPINStatus();
	this.updateAuthenticationStatus(this.sc.queryUserPINStatus());
}



KeyManager.prototype.populateKeys = function() {
	this.sc.enumerateKeys();
	var keys = this.sc.getKeys();
	for (var i = 0; i < keys.length; i++) {
		this.addKey(keys[i]);
	}
}



KeyManager.prototype.addEECertificate = function(keynode, key) {
	if (!this.ks.hasCertificate(key)) {
		return;
	}

	var cert = this.ks.getCertificate(key);

	if (cert.length < 16) {
		print("Does not seem to be a certificate(" + key.getLabel() + ")");
		return;
	}

	if (cert.byteAt(0) == 0x30) {
		var x509 = new X509(cert);
		var label = x509.getSubjectDNString();
		var asn = new ASN1(cert);
		var contextmenu = [];
	} else {
		var cvclist = SmartCardHSM.parseCertificateList(cert);

		var cvc = cvclist[0];
		var label = cvc.toString();
		cvc.decorate();
		var asn = cvc.getASN1();

		if (CVC.isECDSA(cvc.getPublicKeyOID())) {
			var contextmenu = [ KeyManager.EXPORT_PUBLIC_KEY ];

			if (this.authenticationState == 0x9000) {
				contextmenu.push(KeyManager.SIGN_KEY_DOMAIN_MEMBERSHIP);
				contextmenu.push(KeyManager.DERIVE_XKEK);
			}
		} else {
			var contextmenu = [ KeyManager.GENERATE_PKCS10 ];
		}
	}

	contextmenu.push(KeyManager.IMPORT_CERTIFICATE);
	contextmenu.push(KeyManager.EXPORT_CERTIFICATE);
	contextmenu.push(KeyManager.DUMP_CERTIFICATE);

	var certnode = new OutlineNode(label);
	certnode.setUserObject(this);
	certnode.setContextMenu(contextmenu);
	certnode.setIcon("certificate");
	certnode.cert = cert;

	certnode.insert(asn);

	keynode.insert(certnode);

	if (cert.byteAt(0) == 0x67) {
		for (var i = 1; i < cvclist.length; i++) {
			var cvc = cvclist[i];
			var label = cvc.toString();
			cvc.decorate();
			var asn = cvc.getASN1();

			var certnode = new OutlineNode(label);
			certnode.setIcon("certificate");
			certnode.cert = cvc.getBytes();

			certnode.insert(asn);

			keynode.insert(certnode);
		}
	}
}



KeyManager.prototype.addKey = function(key) {
	var label = key.getLabel() + "(" + key.getId() + ")";
	var keynode = new OutlineNode(label);
	keynode.key = key;
	keynode.keylabel = label;
	keynode.setUserObject(this);
	keynode.setIcon("key");

	var pid = key.getPKCS15Id();
	if (pid) {
		var str = "Subject Key Identifier: " + pid.toString(HEX);
		keynode.skidnode = new OutlineNode(str);
		keynode.insert(keynode.skidnode);
	}

	if (typeof(key.useCounter) != "undefined") {
		var str = "Key use counter: " + key.useCounter;
		keynode.usecounternode = new OutlineNode(str);
		keynode.insert(keynode.usecounternode);
	}

	if (key.algorithms) {
		var str = "Algorithms: " + SmartCardHSM.decodeAlgorithmList(key.algorithms);
		keynode.algorithmnode = new OutlineNode(str);
		keynode.insert(keynode.algorithmnode);
	}

	var contextMenu = [ ];
	for (var i = 0; i < this.plugins.length; i++) {
		var plugin = this.plugins[i].instance;
		if (plugin.addKeyContextMenu) {
			plugin.addKeyContextMenu(contextMenu, this.authenticationState, keynode);
		}
	}

	if (this.authenticationState == 0x9000) {
		contextMenu.push(KeyManager.EXPORT_KEY);
		contextMenu.push(KeyManager.DELETE_KEY);
	}
	keynode.setContextMenu(contextMenu);
	this.addEECertificate(keynode, key);

	if (typeof(key.keyDomain) == "undefined") {
		this.view.insert(keynode);
	} else {
		this.keydomains[key.keyDomain].node.insert(keynode);
	}

	for (var i = 0; i < this.plugins.length; i++) {
		var plugin = this.plugins[i].instance;
		if (plugin.addKeyInformation) {
			plugin.addKeyInformation(keynode);
		}
	}
}



KeyManager.prototype.populateCACertificates = function() {
	var certs = this.sc.enumerateCACertificates();
	for (var i = 0; i < certs.length; i++) {
		this.addCACertificate(certs[i], this.sc.getCACertificate(certs[i]));
	}
}



KeyManager.prototype.addCACertificate = function(label, cert) {
	var contextmenu = [];

	try	{
		if (cert.byteAt(0) == 0x30) {
			var x509 = new X509(cert);
			displabel = label + " (" + x509.getSubjectDNString() + ")";
			var asn = new ASN1(cert);
		} else {
			var cvc = new CVC(cert);
			displabel = label + " (" + cvc.toString() + ")";
			cvc.decorate();
			var asn = cvc.getASN1();
		}
	}
	catch(e) {
		print(cert);
		print(e);
		return;
	}

	contextmenu.push(KeyManager.EXPORT_CERTIFICATE);
	contextmenu.push(KeyManager.DUMP_CERTIFICATE);

	if (this.authenticationState == 0x9000) {
		contextmenu.push(KeyManager.DELETE_CACERTIFICATE);
	}

	var certnode = new OutlineNode(displabel);
	certnode.setUserObject(this);
	certnode.setContextMenu(contextmenu);
	certnode.setIcon("certificate");
	certnode.cert = cert;
	certnode.certlabel = label;

	certnode.insert(asn);

	this.view.insert(certnode);
}



KeyManager.prototype.deleteCACertificate = function(node) {
	this.ks.deleteCACertificate(node.certlabel);
	node.remove();
}



KeyManager.prototype.createOutline = function() {
	print("Creating outline...");
	var isInitialized = this.sc.isInitialized();

	var id = this.certchain.devicecert.getCHR().toString();
	id = id.substr(0, id.length - 5);

	var label = this.sc.getLabel();
	if (!label) {
		label = "SmartCard-HSM";
	}

	var str = label + " (" + id + ")";

	if (!isInitialized) {
		str += " - Not initialized";
	}

	this.view = new OutlineNode(str);
	this.view.setUserObject(this);

	if (isInitialized) {
		if ((this.authenticationState == 0x9000) || this.initializedWithTransportPIN) {
			var contextMenu = [	KeyManager.GENERATE_RSA_KEY,
						KeyManager.GENERATE_ECC_KEY,
						KeyManager.GENERATE_AES_KEY,
						KeyManager.IMPORT_KEY,
						KeyManager.IMPORT_CERTIFICATE,
						KeyManager.IMPORT_PKCS12 ];
		} else {
			var contextMenu = [];
		}

		contextMenu.push( KeyManager.INITIALIZE );
		contextMenu.push( KeyManager.CREATE_DKEK_SHARE );
		contextMenu.push( KeyManager.EXPORT_ID );

		if (this.provisioningURL) {
			contextMenu.push( KeyManager.REMOTE_UPDATE );
		}

		for (var i = 0; i < this.plugins.length; i++) {
			var plugin = this.plugins[i].instance;
			if (plugin.addDeviceContextMenu) {
				plugin.addDeviceContextMenu(contextMenu, isInitialized, this.authenticationState);
			}
		}

		this.view.setContextMenu(contextMenu);
		this.populateAuthentication();
		this.populateKeyDomains();
		this.populateKeys();
		this.populateCACertificates();
	} else {
		this.view.setContextMenu([	KeyManager.GENERATE_PIN,
						KeyManager.INITIALIZE ]);
	}

	this.view.show();
}



KeyManager.prototype.exportPublicKey = function(certnode) {
	var cert = new ASN1(certnode.cert);

	assert(cert.tag == 0x67, "Invalid certificate form. Is not an authenticated public key");

	var asn = new ASN1(ASN1.SEQUENCE,
			new ASN1(ASN1.OBJECT_IDENTIFIER, new ByteString("CardContact 4 3 1", OID)),
			new ASN1(0x61, this.certchain.dica.getASN1()),
			new ASN1(0x62, this.certchain.devicecert.getASN1()),
			new ASN1(0x63, cert)
	);

	print(asn);

	var fname = GPSystem.mapFilename(this.certchain.devicecert.getCHR().toString() + "-" + certnode.parent.key.getLabel() + ".pka", GPSystem.USR);

	var fname = Dialog.prompt("Enter file name for public key export", fname, null, "*.pka");

	if (fname == null) {
		return;
	}

	var f = new File(fname);
	f.writeAll(asn.getBytes());
	f.close();

	print("Public key exported to " + fname);
}



KeyManager.prototype.exportDeviceId = function() {
	var asn = new ASN1(ASN1.SEQUENCE,
			new ASN1(ASN1.OBJECT_IDENTIFIER, new ByteString("CardContact 4 1 1", OID)),
			new ASN1(0x61, this.certchain.dica.getASN1()),
			new ASN1(0x62, this.certchain.devicecert.getASN1())
		    );

//	print(asn);

	var fname = GPSystem.mapFilename(this.certchain.devicecert.getCHR().toString() + ".id", GPSystem.USR);

	var fname = Dialog.prompt("Enter file name for device id", fname, null, "*.id");

	if (fname == null) {
		return;
	}

	var f = new File(fname);
	f.writeAll(asn.getBytes());
	f.close();

	print("Device Id exported to " + fname);
}



KeyManager.prototype.generatePKCS10 = function(certnode) {
	var cert = new CVC(certnode.cert);

	var dn = Dialog.prompt("Enter Distinguished Name (DN) for PKCS#10 request", "c=UT,o=ACME,cn=Joe Doe");

	if (dn == null) {
		return;
	}

	var subject = PKIXCommon.parseDN(dn);

	var gen = new PKCS10Generator(this.sc.getCrypto());

	gen.setSignatureAlgorithm(Crypto.RSA_SHA256);

	gen.setSubject(subject);

	gen.setPublicKey(cert.getPublicKey());

	var req = gen.generateCertificationRequest(certnode.parent.key);

	var fname = GPSystem.mapFilename("req_" + certnode.parent.keylabel + ".pem", GPSystem.USR);

	var fname = Dialog.prompt("Enter file name for PKCS#10 request", fname, null, "*.pem");

	if (fname == null) {
		return;
	}

	var f = new File(fname);
	if (fname.substr(-3) == "pem") {
		f.writeAll(PKIXCommon.toPEM("CERTIFICATE REQUEST", req.getBytes()));
	} else {
		f.writeAll(req.getBytes());
	}
	f.close();

	print("PKCS#10 Request written to " + fname);
}



KeyManager.prototype.importCertificate = function(certnode) {
	var fname = Dialog.prompt("Enter file name of certificate", this.lastfile, null, "*.pem");

	if (fname == null) {
		return null;
	}

	var f = new File(fname);
	var bin = f.readAllAsBinary();
	f.close();

	if (bin.byteAt(0) == 0x30) {
		var cert = new X509(bin);
	} else {
		var bin = PKIXCommon.parsePEM("CERTIFICATE", bin.toString(ASCII));
		if (bin.length == 0 || bin.byteAt(0) != 0x30) {
			print(fname + " does not seem to be a X509 certificate");
			return;
		}
		var cert = new X509(bin);
	}

	print(cert);

	var ok = Dialog.prompt("OK to insert this certificate");

	if (ok == null) {
		return;
	}

	var label = cert.getSubjectDNString();
	if (certnode.parent == null) {
		this.ks.storeCACertificate(label, cert);
		this.createOutline();
	} else {
		this.ks.storeEndEntityCertificate(certnode.parent.key, cert);
		certnode.setLabel(label);
	}

	print("Certificate " + label + " imported");
}



KeyManager.prototype.exportCertificate = function(certnode) {

	var fname = GPSystem.mapFilename("cert_" + certnode.parent.keylabel + ".pem", GPSystem.USR);

	var fname = Dialog.prompt("Enter file name for exported certificate", fname, null, "*.pem");

	if (fname == null) {
		return;
	}

	var f = new File(fname);
	if (fname.substr(-3) == "pem") {
		f.writeAll(PKIXCommon.toPEM("CERTIFICATE", certnode.cert));
	} else {
		f.writeAll(certnode.cert);
	}
	f.close();

	print("Certificate written to " + fname);
}



KeyManager.prototype.dumpCertificate = function(certnode) {
	var cert = certnode.cert;

	if (cert.byteAt(0) == 0x30) {
		var x = new X509(cert);
		print(x);
	} else {
		var x = new CVC(cert);
		x.decorate();
		print(x.getASN1());
	}
}



KeyManager.prototype.registerPublicKey = function(id) {
	var fname = Dialog.prompt("Enter file name for public key import", this.lastfile, null, "*.pka");

	if (fname == null) {
		return null;
	}

	var f = new File(fname);
	var chain = f.readAllAsBinary();
	f.close();

	if (chain.byteAt(0) != 0x30) {
		throw new GPError("KeyManager", GPError.INVALID_DATA, 0, "File does not contain a public key with certificates");
	}

	this.lastfile = fname;

	var a = new ASN1(chain);
	print(a);

	if (a.get(0).tag == ASN1.OBJECT_IDENTIFIER) {
		var oid = new ByteString("CardContact 4 3 1", OID);
		assert(a.get(0).value.equals(oid), "Invalid file format");
		var pk = new CVC(a.find(0x63).get(0));
		var devcert = new CVC(a.find(0x62).get(0));
		var dicacert = new CVC(a.find(0x61).get(0));
	} else {
		var pk = new CVC(a.get(0));
		var devcert = new CVC(a.get(1));
		var dicacert = new CVC(a.get(2));
	}

	assert(dicacert.verifyWithCVC(this.crypto, SmartCardHSM.rootCerts[dicacert.getCAR()]));
	assert(devcert.verifyWith(this.crypto, dicacert.getPublicKey(SmartCardHSM.rootCerts.UTSRCACC100001.getPublicKey()), dicacert.getPublicKeyOID()));

	var str = (typeof(id) == "undefined" ? "Add the key issued to " : "Replace key " + id + " with ");
	var ok = Dialog.prompt(str + pk.getCHR() + " on device " + devcert.getCHR() + " (Cancel for No) ?");
	if (ok == null) {
		return;
	}

	this.managePKA.registerPublicKey(pk, devcert, dicacert, id);
	this.updatePKAStatus();
//	this.updateAuthenticationStatus(this.sc.queryUserPINStatus());
}



KeyManager.prototype.authenticateWithPublicKey = function() {
 	var readers = Card.getReaderList();

	var reader = Dialog.prompt("Please select card reader with public key", "", readers);

	if (reader == null) {
		return;
	}

	var pcard = new Card(reader);
	pcard.reset(Card.RESET_COLD);

	var sc = new SmartCardHSM(pcard);
	var ks = new HSMKeyStore(sc);

	var keys = ks.enumerateKeys()
	var keylabel = Dialog.prompt("Please select a key for public key authentication", "", keys);

	if (keylabel == null) {
		return;
	}

	var key = ks.getKey(keylabel);
	var cert = ks.getCertificate(keylabel);
	var cvc = new CVC(cert);

	var status = this.managePKA.checkKeyStatus(cvc.getCHR());

	if (status == ManagePKA.KEY_NOT_FOUND) {
		print("Key not registered as public key for authentication");
		return;
	}

	if (status == ManagePKA.KEY_ALREADY_AUTHENTICATED) {
		print("Key already authenticated");
		return;
	}

	var cs = sc.getNativeCardService();
	cs.useClassThreePinPad(true);

	var sw = sc.verifyUserPIN();
	if (sw != 0x9000) {
		print(SmartCardHSM.describePINStatus(sw, "User PIN"));
		return;
	}

	this.managePKA.performAuthentication(sc, key);
	this.updatePKAStatus();
	this.changedAuthenticationStatus(this.sc.queryUserPINStatus());
}



KeyManager.prototype.initialize = function() {
	var initializer = new SmartCardHSMInitializer(this.sc.card);

	var changeSOPIN = false;
	var newSOPIN;
	if (this.sc.isInitialized()) {
		var soPIN = Dialog.prompt("Enter Initialization Code (SO-PIN)", this.devcfg.soPIN ? this.devcfg.soPIN : "*");
		if (soPIN == null) {
			return;
		}
		if (soPIN.length == 0) {
			soPIN = "3537363231383830";
		}

		if (this.hasTokenManagementKey()) {
			var opt = [ "Keep current SO-PIN", "Set a new managed SO-PIN", "Set a user selected SO-PIN", "Set the Default SO-PIN" ];
			var str = Dialog.prompt("Select option", opt[0], opt);
			if (str == null) {
				return;
			}
			if (str == opt[1]) {
				changeSOPIN = true;
			} else if (str == opt[2]) {
				changeSOPIN = true;
				str = this.promptNewPIN(1, false);
				if (str == null) {
					return;
				}
				newSOPIN = new ByteString(str, HEX)
			} else if (str == opt[3]) {
				changeSOPIN = true;
				newSOPIN = new ByteString("3537363231383830", HEX)
			}
		}
	} else {
		var soPIN = this.promptNewPIN(1, true);
		if (!soPIN) {
			return;
		}
	}

	initializer.setInitializationCode(new ByteString(soPIN, HEX));

	var label = Dialog.prompt("Define a label (optional)", "");
	if (label == null) {
		return;
	}
	if (label) {
		initializer.setLabel(label);
	}

	var provURL = Dialog.prompt("Define a provisioning URL (optional)", "");
	if (provURL == null) {
		return;
	}
	if (provURL) {
		initializer.setProvisioningURL(provURL);
	}

	if (this.hasTokenManagementKey() && !newSOPIN && (soPIN == this.devcfg.soPIN)) {
		var salt = this.kmksalt;
		if (changeSOPIN) {
			var salt = this.crypto.generateRandom(8);
		}
		initializer.setTokenManagementKey(this.managementToken.kcv, salt);
	}

	var options = [ KeyManager.USER_PIN, KeyManager.TRANSPORT_PIN, KeyManager.PUBLIC_KEY_AUTHENTICATION];
	if ((this.sc.major > 3) || ((this.sc.major >= 3) && (this.sc.minor >= 4))) {
		options.push(KeyManager.PUBLIC_KEY_AUTHENTICATION_OR_PIN);
		options.push(KeyManager.PUBLIC_KEY_AUTHENTICATION_AND_PIN);
	}
	options.push(KeyManager.BIOMETRIC_MATCH_SOC);
	options.push(KeyManager.BIOMETRIC_MATCH_SOC_OLD);
	options.push(KeyManager.BIOMETRIC_MATCH_NT);

	var authmech = Dialog.prompt("Select authentication mechanism", KeyManager.USER_PIN, options);

	if ((authmech == null) || (!authmech.equals(KeyManager.USER_PIN) &&
				   !authmech.equals(KeyManager.TRANSPORT_PIN) &&
				   !authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION) &&
				   !authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_OR_PIN) &&
				   !authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_AND_PIN) &&
				   !authmech.equals(KeyManager.BIOMETRIC_MATCH_SOC) &&
				   !authmech.equals(KeyManager.BIOMETRIC_MATCH_SOC_OLD) &&
				   !authmech.equals(KeyManager.BIOMETRIC_MATCH_NT))) {
		return;
	}

	if (authmech.equals(KeyManager.USER_PIN) ||
	    authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_OR_PIN) ||
	    authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_AND_PIN) ||
	    authmech.equals(KeyManager.TRANSPORT_PIN)) {
		var rrc = Dialog.prompt("Allow RESET RETRY COUNTER", KeyManager.WITHOUT_RRC, [
						KeyManager.WITHOUT_RRC,
						KeyManager.WITH_RRC,
						KeyManager.WITH_RRC_PIN ]);

		if ((rrc == null) || (!rrc.equals(KeyManager.WITH_RRC) &&
				!rrc.equals(KeyManager.WITH_RRC_PIN) &&
				!rrc.equals(KeyManager.WITHOUT_RRC))) {
			return;
		}
	}

	if (authmech.equals(KeyManager.USER_PIN) ||
		authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_OR_PIN) ||
		authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_AND_PIN)) {
		var userPIN = this.promptNewPIN(2, true);
		initializer.setUserPIN(new ByteString(userPIN, ASCII));
		initializer.setResetRetryCounterMode(!rrc.equals(KeyManager.WITHOUT_RRC));
		initializer.setResetRetryCounterResetOnlyMode(rrc.equals(KeyManager.WITH_RRC));
	} else if (authmech.equals(KeyManager.TRANSPORT_PIN)) {
		var transportPIN = this.promptNewPIN(3, true);
		initializer.setUserPIN(new ByteString(transportPIN, ASCII));
		initializer.setTransportPINMode(true);
		initializer.setResetRetryCounterMode(!rrc.equals(KeyManager.WITHOUT_RRC));
		initializer.setResetRetryCounterResetOnlyMode(rrc.equals(KeyManager.WITH_RRC));
		this.initializedWithTransportPIN = true;
	} else if (authmech.equals(KeyManager.BIOMETRIC_MATCH_SOC)) {
		var socmgr = new ByteString("D276000172536F434D01", HEX);
		initializer.setBioTemplate(0, socmgr, 0x80);		// PIN
		initializer.setBioTemplate(1, socmgr, 0x00);		// Bio
	} else if (authmech.equals(KeyManager.BIOMETRIC_MATCH_SOC_OLD)) {
		var socmgr = new ByteString("FF64652E6264722E62736F6301", HEX);
		initializer.setBioTemplate(0, socmgr, 0x80);		// PIN
		initializer.setBioTemplate(1, socmgr, 0x00);		// Bio
	} else if (authmech.equals(KeyManager.BIOMETRIC_MATCH_NT)) {
		var socmgr = new ByteString("F14E4653657276657253616D706C65", HEX);
		initializer.setBioTemplate(0, socmgr, 0x01);
//		initializer.setBioTemplate(1, socmgr, 0x02);
	}
	if (authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION) ||
		authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_OR_PIN) ||
		authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_AND_PIN)) {
		var str = Dialog.prompt("Enter total number of public keys", "1");

		if (str == null) {
			return;
		}
		var numberOfPublicKeys = parseInt(str);

		var str = Dialog.prompt("Enter number of public keys required for authentication", "1");

		if (str == null) {
			return;
		}
		var requiredPublicKeysForAuthentication = parseInt(str);

		initializer.setPublicKeyAuthenticationParameter(requiredPublicKeysForAuthentication, numberOfPublicKeys);
		if (authmech.equals(KeyManager.PUBLIC_KEY_AUTHENTICATION_AND_PIN)) {
			initializer.setCombinedAuthenticationMode(true);
		}

		var str = Dialog.prompt("Allow replacing registered public keys (Cancel for No) ?");
		if (str == "OK") {
			initializer.setReplacePKAKeyMode(true);
		}
	}

	var dkek = Dialog.prompt(KeyManager.DKEK_SELECT, KeyManager.DKEK_KEY_DOMAINS, [
						KeyManager.DKEK_NONE,
						KeyManager.DKEK_RANDOM_DKEK,
						KeyManager.DKEK_SHARES,
						KeyManager.DKEK_KEY_DOMAINS]);

	if (dkek == null) {
		return;
	}

	if (dkek.equals(KeyManager.DKEK_KEY_DOMAINS)) {
		var str = Dialog.prompt(KeyManager.DKEK_NO_OF_KEY_DOMAINS, "4");
		initializer.setKeyDomains(parseInt(str));
	} else if (!dkek.equals(KeyManager.DKEK_NONE)) {
		var shares = 0;
		if (dkek.equals(KeyManager.DKEK_SHARES)) {
			var str = Dialog.prompt(KeyManager.DKEK_NO_OF_SHARES, "1");
			if (str == null) {
				return;
			}

			var shares = parseInt(str);
		}
		initializer.setDKEKShares(shares);
	}

	print("Initializing, please wait...");
	initializer.initialize();

	if (this.hasProfile) {
		if (this.devcfg.soPIN && !soPIN.equals(this.devcfg.soPIN)) {
			if (Dialog.prompt("Update profile on disk with changed SO-PIN (Cancel for No) ?")) {
				this.devcfg.soPIN = soPIN;
			} else {
				delete this.devcfg.soPIN;
			}
		}
		if (userPIN) {
			if (this.devcfg.userPIN && !userPIN.equals(this.devcfg.userPIN)) {
				if (Dialog.prompt("Update profile on disk with changed User-PIN (Cancel for No) ?")) {
					this.devcfg.userPIN = userPIN;
				} else {
					delete this.devcfg.userPIN;
				}
			}
			delete this.devcfg.transportPIN;
		}
		if (transportPIN) {
			if (this.devcfg.transportPIN && !transportPIN.equals(this.devcfg.transportPIN)) {
				if (Dialog.prompt("Update profile on disk with changed Transport-PIN (Cancel for No) ?")) {
					this.devcfg.transportPIN = transportPIN;
				} else {
					delete this.devcfg.transportPIN;
				}
			}
			delete this.devcfg.userPIN;
		}
		this.writeProfile();
	} else {
		if (!soPIN.equals(this.devcfg.soPIN)) {
			if (Dialog.prompt("Keep a profile on disk to save the PINs (Cancel for No) ?")) {
				this.devcfg.soPIN = soPIN;
				if (userPIN) {
					this.devcfg.userPIN = userPIN;
				}
				if (transportPIN) {
					this.devcfg.transportPIN = transportPIN;
				}
				this.writeProfile();
			}
		}
	}

	if (changeSOPIN) {
		print("Old SO-PIN " + soPIN);
		var oldSOPIN = new ByteString(soPIN, HEX);

		if (!newSOPIN) {
			this.determineSOPIN(salt);
			var newSOPIN = new ByteString(this.devcfg.soPIN, HEX);
		}
		this.sc.changeInitializationCode(oldSOPIN, newSOPIN);
	}

	print("Initializing complete");
	this.authenticationState = this.sc.queryUserPINStatus();
	this.createOutline();
}



KeyManager.prototype.remoteUpdate = function() {
	this.sc.card.remoteUpdate(this.provisioningURL);
	if (this.sc.card.remoteMessage) {
		print("Remote Update completed - " + this.sc.card.remoteMessage + "(" + this.sc.card.remoteMessageId + ")");
	} else {
		print("Remote Update completed");
	}
	this.createOutline();
}



KeyManager.prototype.createDKEKShare = function() {
	var fname = Dialog.prompt("Enter file name for DKEK share", this.lastfile, null, "*.pbe");

	if (fname == null) {
		return;
	}

	if (fname.indexOf(".") == -1) {
		fname += ".pbe";
	}

	var f = new File(fname);
	if (f.exists()) {
		var rsp = Dialog.prompt("File does already exists. OK to overwrite ?");
		if (rsp == null) {
			return;
		}
	}

	var pwd = Dialog.prompt("Enter password for DKEK share", "**");
	if (pwd == null) {
		return;
	}

	var pwd2 = Dialog.prompt("Please repeat password for DKEK share", "**");
	if (pwd2 == null) {
		pwd.clear();
		return;
	}

	if (!pwd.equals(pwd2)) {
		pwd.clear();
		pwd2.clear();
		print("Passwords entered do not match");
		return;
	}

	pwd2.clear();

	var rnd1 = this.sc.generateRandom(32);
	var rnd2 = this.crypto.generateRandom(32);
	var rnd = rnd1.xor(rnd2);
	rnd1.clear();
	rnd2.clear();

	var encdkekshare = DKEK.encryptKeyShare(rnd, pwd);

	pwd.clear();
	rnd.clear();

	f.writeAll(encdkekshare);
	f.close();

	print("New DKEK share written to " + fname);
	this.lastfile = fname;
}



KeyManager.prototype.importDKEKShare = function(node) {
	var kdid = node.kdid;

	var fname = Dialog.prompt("Enter file name containing DKEK share", this.lastfile, null, "*.pbe");

	if (fname == null) {
		return;
	}

	var f = new File(fname);
	var encdkekshare = f.readAllAsBinary();
	f.close();

	var pwd = Dialog.prompt("Enter password for DKEK share", "**");
	if (pwd == null) {
		return null;
	}

	var status = this.sc.importEncryptedKeyShare(encdkekshare, pwd, kdid);
	pwd.clear();

	if (status.sw != 0x9000) {
		print("Import failed with SW1/SW2 = " + status.sw.toString(16));
	}
	this.lastfile = fname;
	this.updateKeyDomainStatus(kdid, status);
}



KeyManager.prototype.generateRSAKey = function(node) {
	var kdid = node.kdid;

	var keysize = Dialog.prompt(KeyManager.SELECT_KEY_SIZE, "2048", [ "1024", "1536", "2048", "3072", "4096" ]);
	if (keysize == null) {
		return;
	}
	keysize = parseInt(keysize);

	var label = "";
	while(true) {
		var label = Dialog.prompt(KeyManager.ENTER_KEY_LABEL, label);
		if (label == null) {
			return;
		}

		if (this.sc.getKey(label)) {
			if (Dialog.prompt(KeyManager.KEY_LABEL_EXISTS) == null) {
				return;
			}
			continue;
		}
		break;
	}

	var spec = new SmartCardHSMKeySpecGenerator(Crypto.RSA, keysize);

	if (typeof(kdid) != "undefined" ) {
		spec.setKeyDomain(kdid);
	}

	spec.setCHR(this.chr);
	spec.setInnerCAR(this.chr);

	var algolist = "";
	while(true) {
		var algolist = Dialog.prompt(KeyManager.RSA_ALGORITHM_LIST, algolist);
		if (algolist == null) {
			return;
		}

		if (algolist.length > 0) {
			var algo = SmartCardHSM.encodeAlgorithmList(algolist);
			if (algo == null) {
				if (Dialog.prompt(KeyManager.INVALID_ALGORITHM_LIST) == null) {
					return;
				}
				continue;
			}

			if ((this.sc.major == 3) && (this.sc.minor == 1) && (algo.find(ByteString.valueOf(0x92)) != -1)) {
				if (Dialog.prompt(KeyManager.BUG31) == null) {
					continue;
				}
			}
			spec.setAlgorithms(algo);
		}
		break;
	}

	print(KeyManager.GENERATING_KEY);
	var req = this.ks.generateKeyPair(label, spec);
	this.ks.storeEndEntityCertificate(label, req);

	print(KeyManager.GENERATING_KEY_DONE);
	this.createOutline();
}



KeyManager.prototype.generateECCKey = function(node) {
	var kdid = node.kdid;

	var curve = Dialog.prompt(KeyManager.SELECT_CURVE, "brainpoolP256r1", KeyManager.CURVES);
	if (curve == null) {
		return;
	}

	var dom = new Key();
	dom.setComponent(Key.ECC_CURVE_OID, new ByteString(curve, OID));

	var label = "";
	while(true) {
		var label = Dialog.prompt(KeyManager.ENTER_KEY_LABEL, label);
		if (label == null) {
			return;
		}

		if (this.sc.getKey(label)) {
			if (Dialog.prompt(KeyManager.KEY_LABEL_EXISTS) == null) {
				return;
			}
			continue;
		}
		break;
	}

	var spec = new SmartCardHSMKeySpecGenerator(Crypto.EC, dom);

	if (typeof(kdid) != "undefined" ) {
		spec.setKeyDomain(kdid);
	}

	spec.setCHR(this.chr);
	spec.setInnerCAR(this.chr);

	var algolist = "";
	while(true) {
		var algolist = Dialog.prompt(KeyManager.ECC_ALGORITHM_LIST, algolist);
		if (algolist == null) {
			return;
		}

		if (algolist.length > 0) {
			var algo = SmartCardHSM.encodeAlgorithmList(algolist);
			if (algo == null) {
				if (Dialog.prompt(KeyManager.INVALID_ALGORITHM_LIST) == null) {
					return;
				}
				continue;
			}

			if ((this.sc.major == 3) && (this.sc.minor == 1) && (algo.find(ByteString.valueOf(0x92)) != -1)) {
				if (Dialog.prompt(KeyManager.BUG31) == null) {
					continue;
				}
			}
			spec.setAlgorithms(algo);
		}
		break;
	}

	print(KeyManager.GENERATING_KEY);
	var req = this.ks.generateKeyPair(label, spec);
	this.ks.storeEndEntityCertificate(label, req);

	print(KeyManager.GENERATING_KEY_DONE);
	this.createOutline();
}



KeyManager.prototype.generateAESKey = function(node) {
	if ((this.sc.major == 3) && ((this.sc.minor == 1) || (this.sc.minor == 1))) {
		if (Dialog.prompt(KeyManager.BUGAES) == null) {
			return;
		}
	}


	var kdid = node.kdid;

	var keysize = Dialog.prompt(KeyManager.SELECT_KEY_SIZE, "128", [ "128", "192", "256" ] );
	if (keysize == null) {
		return;
	}
	keysize = parseInt(keysize);

	var label = "";
	while(true) {
		var label = Dialog.prompt(KeyManager.ENTER_KEY_LABEL, label);
		if (label == null) {
			return;
		}

		if (this.sc.getKey(label)) {
			if (Dialog.prompt(KeyManager.KEY_LABEL_EXISTS) == null) {
				return;
			}
			continue;
		}
		break;
	}

	var spec = new SmartCardHSMKeySpecGenerator(Crypto.AES, keysize);

	if (typeof(kdid) != "undefined") {
		spec.setKeyDomain(kdid);
	}

	var algolist = "DERIVE_SP800_56C";
	while(true) {
		var algolist = Dialog.prompt(KeyManager.AES_ALGORITHM_LIST, algolist);
		if (algolist == null) {
			return;
		}

		var algo = SmartCardHSM.encodeAlgorithmList(algolist);
		if (algo == null) {
			if (Dialog.prompt(KeyManager.INVALID_ALGORITHM_LIST) == null) {
				return;
			}
			continue;
		}

		spec.setAlgorithms(algo);
		break;
	}

	print(KeyManager.GENERATING_KEY);
	var req = this.ks.generateKey(label, spec);

	print(KeyManager.GENERATING_KEY_DONE);
	this.createOutline();
}



KeyManager.prototype.exportKey = function(node) {
	var fname = GPSystem.mapFilename(node.keylabel + ".wky", GPSystem.USR);

	var fname = Dialog.prompt("Enter file name for key export", fname, null, "*.wky");

	if (fname == null) {
		return null;
	}

	var bin = this.ks.exportKey(node.key);

	var f = new File(fname);
	f.writeAll(bin);
	f.close();
	print("Key exported to " + fname);
}



KeyManager.prototype.importKey = function(node) {
	var fname = Dialog.prompt("Enter file name for key import", this.lastfile, null, "*.wky");

	if (fname == null) {
		return null;
	}

	var f = new File(fname);
	var bin = f.readAllAsBinary();
	f.close();

	if (bin.byteAt(0) != 0x30) {
		throw new GPError("KeyManager", GPError.INVALID_DATA, 0, "File does not contain a wrapped key");
	}

	this.lastfile = fname;
	this.ks.importKey(bin);
	this.createOutline();
}



KeyManager.prototype.importPKCS12 = function(node) {
	var str = Dialog.prompt(KeyManager.DKEK_NO_OF_SHARES, "1");
	if (str == null) {
		return;
	}

	var shares = parseInt(str);

	var dkek = new DKEK(this.crypto);
	for (var cnt = 0; cnt < shares; cnt++) {
		var fname = Dialog.prompt("Enter file name containing DKEK share", this.lastfile, null, "*.pbe");

		if (fname == null) {
			return;
		}

		var f = new File(fname);
		var encdkekshare = f.readAllAsBinary();
		f.close();

		var pwd = Dialog.prompt("Enter password for DKEK share", "**");
		if (pwd == null) {
			return;
		}

		var dkekshare = DKEK.decryptKeyShare(encdkekshare, pwd);
		dkek.importDKEKShare(dkekshare);
		dkekshare.clear();

		this.lastfile = fname;
	}

	do	{
		var file = Dialog.prompt("Select PKCS#12 container", this.lastfile, null, "*.p12");

		if (file == null) {
			return;
		}

		var pwd = Dialog.prompt("Enter PKCS#12 password", "*");

		if (pwd == null) {
			return;
		}

		var p12 = new KeyStore("BC", "PKCS12", file, pwd);
		this.lastfile = file;

		var aliases = p12.getAliases();

		do	{
			var alias = Dialog.prompt("Select key", "", aliases);
			assert(alias != null);

			var key = new Key();
			key.setType(Key.PRIVATE);
			key.setID(alias);
			try	{
				p12.getKey(key);
			}
			catch(e) {
				print(e);
				key = null;
			}
			var cert = p12.getCertificate(alias);

			print(cert);

			do	{
				var alias = Dialog.prompt("Enter key name for import", alias);
				if (alias == null) {
					return;
				}
				if (!this.ks.hasKey(alias)) {
					break;
				}
				Dialog.prompt("A key with label " + alias + " does already exists. Please choose a different name");
			} while (1);

			if (key != null) {
				print("Importing key and certificate...");

				var pubkey = cert.getPublicKey();
				var blob = dkek.encodeKey(key, pubkey);

				if (pubkey.getComponent(Key.MODULUS)) {
					hkey = this.ks.importRSAKey(alias, blob, pubkey.getSize());
					var signalgo = Crypto.RSA_PSS_SHA256;
				} else {
					hkey = this.ks.importECCKey(alias, blob, pubkey.getSize());
					var signalgo = Crypto.ECDSA_SHA256;
				}

				this.ks.storeEndEntityCertificate(alias, cert);

				// Test import
				var msg = new ByteString("Hello World", ASCII);

				var signature = hkey.sign(signalgo, msg);

				assert(this.crypto.verify(pubkey, signalgo, msg, signature), "Signature verification of imported key failed");
				print("Import completed");
			} else {
				print("Importing certificate...");

				this.ks.storeCACertificate(alias, cert);

			}
			this.createOutline();
		} while (aliases.length > 1 && Dialog.prompt("Import more keys ?"));

	} while (Dialog.prompt("Import more PKCS#12 files ?"));
	dkek.clear();
}



KeyManager.prototype.deleteKey = function(node) {
	this.ks.deleteKey(node.key);
	node.remove();

	for (var i = 0; i < this.plugins.length; i++) {
		var plugin = this.plugins[i].instance;
		if (plugin.deleteKey) {
			plugin.deleteKey(node);
		}
	}
}



KeyManager.prototype.readProfile = function() {
	try	{
		var f = new File(this.profileName);
		var c = f.readAllAsString();
		f.close();
		this.devcfg = JSON.parse(c);
		this.hasProfile = true;
		if (this.devcfg.soPIN) {
			print("Retrieved SO-PIN from profile");
		}
		if (this.devcfg.userPIN) {
			print("Retrieved User-PIN from profile");
		}
		if (this.devcfg.transportPIN) {
			print("Retrieved Transport-PIN from profile");
		}
	}
	catch(e) {
	}
}



KeyManager.prototype.writeProfile = function() {
	var f = new File(this.profileName);
	f.writeAll(JSON.stringify(this.devcfg, null, "\t"));
	f.close();
	this.hasProfile = true;
	print("Profile saved to " + this.profileName);
}



KeyManager.prototype.decimalize = function(raw, count) {
	// Decimalize raw binary data in parameter raw into a numeric sequence of count digits
	var c;
	do	{
		var str = raw.toString(HEX);
		c = count;
		var result = "";
		var i = 0;

		while ((i < str.length) && (c > 0)) {
			var d = str.charCodeAt(i);
			if ((d >= 0x30) && (d <= 0x39)) {
				result = result.concat(String.fromCharCode(d));
				c--;
			}
			i++;
		}
		if (c > 0) {
			raw = raw.not();
		}

	} while (c > 0);

	return result;
}



KeyManager.prototype.generatePINs = function() {
	var rnd = this.sc.generateRandom(24);
	var soPIN = rnd.bytes(0,8).toString(HEX);
	var userPIN = this.decimalize(rnd.bytes(8,8), 6);
	var transportPIN = this.decimalize(rnd.bytes(16,8), 6);

	print("\nSO-PIN        : " + soPIN);
	print(  "User-PIN      : " + userPIN);
	print(  "Transport-PIN : " + transportPIN);

	if (Dialog.prompt("Use the PINs as default values when initializing this device (Cancel for No) ?")) {
		this.devcfg.soPIN = soPIN;
		this.devcfg.userPIN = userPIN;
		this.devcfg.transportPIN = transportPIN;

		if (!this.hasProfile && Dialog.prompt("Save generated PINs to disk (Warning: Will be saved in plain) ?")) {
			this.writeProfile();
		}
	}
}



KeyManager.prototype.actionListener = function(source, action) {
	for (var i = 0; i < this.plugins.length; i++) {
		var plugin = this.plugins[i].instance;
		if (plugin.actionListener) {
			if (plugin.actionListener(source, action)) {
				return;
			}
		}
	}

	switch(action) {
		case KeyManager.INITIALIZE:
			this.initialize();
			break;
		case KeyManager.EXPORT_ID:
			this.exportDeviceId();
			break;
		case KeyManager.REMOTE_UPDATE:
			this.remoteUpdate();
			break;
		case KeyManager.GENERATE_PIN:
			this.generatePINs();
			break;
		case KeyManager.GENERATE_RSA_KEY:
			this.generateRSAKey(source);
			break;
		case KeyManager.GENERATE_ECC_KEY:
			this.generateECCKey(source);
			break;
		case KeyManager.GENERATE_AES_KEY:
			this.generateAESKey(source);
			break;
		case KeyManager.EXPORT_KEY:
			this.exportKey(source);
			break;
		case KeyManager.IMPORT_KEY:
			this.importKey();
			break;
		case KeyManager.IMPORT_PKCS12:
			this.importPKCS12();
			break;
		case KeyManager.CREATE_DKEK_SHARE:
			this.createDKEKShare();
			break;
		case KeyManager.IMPORT_DKEK_SHARE:
			this.importDKEKShare(source);
			break;
		case KeyManager.DELETE_KEY:
			this.deleteKey(source);
			break;
		case KeyManager.EXPORT_PUBLIC_KEY:
			this.exportPublicKey(source);
			break;
		case KeyManager.SIGN_KEY_DOMAIN_MEMBERSHIP:
			this.groupSignerOperation(source);
			break;
		case KeyManager.GENERATE_PKCS10:
			this.generatePKCS10(source);
			break;
		case KeyManager.IMPORT_CERTIFICATE:
			this.importCertificate(source);
			break;
		case KeyManager.EXPORT_CERTIFICATE:
			this.exportCertificate(source);
			break;
		case KeyManager.DELETE_CACERTIFICATE:
			this.deleteCACertificate(source);
			break;
		case KeyManager.DUMP_CERTIFICATE:
			this.dumpCertificate(source);
			break;
		case KeyManager.LOGIN_WITH_USER_PIN:
			this.login();
			break;
		case KeyManager.LOGIN_WITH_USER_PIN_PAD:
			this.loginPinPAD();
			break;
		case KeyManager.LOGIN_WITH_USER_BIO1:
			this.loginBioMatch(0x85);
			break;
		case KeyManager.LOGIN_WITH_USER_BIO2:
			this.loginBioMatch(0x86);
			break;
		case KeyManager.CHANGE_PIN:
			this.changePIN(false);
			break;
		case KeyManager.CHANGE_SOPIN:
			this.changeSOPIN(true);
			break;
		case KeyManager.UNBLOCK_PIN:
			this.unblockPIN(false);
			break;
		case KeyManager.RESET_PIN:
			this.unblockPIN(true);
			break;
		case KeyManager.LOGOUT:
			this.logout();
			break;
		case KeyManager.REGISTER_PUBLIC_KEY:
			this.registerPublicKey();
			break;
		case KeyManager.REPLACE_PUBLIC_KEY:
			this.registerPublicKey(source.id);
			break;
		case KeyManager.AUTHENTICATE_PUBLIC_KEY:
			this.authenticateWithPublicKey();
			break;
		case KeyManager.CREATE_DKEK_DOMAIN:
			this.createDKEKDomain(source);
			break;
		case KeyManager.CREATE_XKEK_DOMAIN:
			this.createXKEKDomain(source);
			break;
		case KeyManager.DELETE_KEY_DOMAIN:
			this.deleteDomain(source);
			break;
		case KeyManager.ASSOCIATE_XKEK_DOMAIN:
			this.associateXKEKDomain(source);
			break;
		case KeyManager.CREATE_EXCHANGE_KEY:
			this.createExchangeKey(source);
			break;
		case KeyManager.DELETE_KEK:
			this.deleteKEK(source);
			break;
		case KeyManager.DERIVE_XKEK:
			this.deriveXKEK(source);
			break;
		default:
			print("Unknown action: " + action);
	}
}



var card = new Card(_scsh3.reader);
var km = new KeyManager(card);

print("-------------------------------------------------------------------");
print("Please right-click on nodes in the outline to see possible actions.");
print("For most operations you will need to authenticate first using a");
print("mechanism from the User PIN context menu.");
