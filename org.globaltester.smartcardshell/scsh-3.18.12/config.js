//
//  ---------
// |.##> <##.|  CardContact Software & System Consulting
// |#       #|  32429 Minden, Germany (www.cardcontact.de)
// |#       #|  Copyright (c) 1999-2006. All rights reserved
// |'##> <##'|  See file COPYING for details on licensing
//  ---------
//
// Setup runtime environment
//

//
// Shortcut to reset card and display atr
//
function reset() {
        card = new Card(_scsh3.reader);

        var atr = card.reset(Card.RESET_COLD);
        print(atr.toByteString());
        return atr;
}


//
// Shortcut to exchange APDU with card
//
function apdu(data) {
        if (typeof(card) == "undefined")
                card = new Card(_scsh3.reader);

        var res = card.plainApdu(new ByteString(data, HEX));
        if (card.SW != 0x9000) {
                print("Card error SW1/SW2=" + card.SW.toString(16) + " - " + card.SWMSG);
        }
        return res;
}


//
// Determine platform id
//
// 1 - SCSH3 command line and ScriptRunner
// 2 - GUI Shell
// 3 - Eclipse Plug-in
// 4 - ScriptingServer
//
function getPlatformID() {
	var sysid = GPSystem.getSystemID();
	sysid = sysid.toString(OID).split(".");
	sysid = parseInt(sysid[sysid.length - 5]);
	return sysid;
}



//
// Minimal assert() function
//
function assert(condition, message) {
	if (!condition) {
		if (!message) {
			message = "Assertion failed";
		} else {
			message = "Assertion failed - " + message;
		}
		throw new GPError("shell", GPError.USER_DEFINED, 0, message);
	}
}


//
// Function used by scripts to define minimum version requirements
//
function requires(version) {
	var s = version.split(".");
	assert(s.length >= 1);

	var reqmajor = parseInt(s[0]);
	var reqminor = (s.length >= 2) ? parseInt(s[1]) : 0;
	var reqbuild = (s.length >= 3) ? parseInt(s[2]) : 0;

	var id = GPSystem.getSystemID();
	var s = id.toString(OID).split(".");

	var major = parseInt(s[s.length - 4]);
	var minor = parseInt(s[s.length - 3]);
	var build = parseInt(s[s.length - 2]);

	if ((major < reqmajor) ||
	    ((major == reqmajor) && (minor < reqminor)) ||
	    ((major == reqmajor) && (minor == reqminor) && (build < reqbuild))) {
		print("This script uses features only available in version " + version + " or later.");
		print("It may not run as expected, please update to a more current version.");
		GPSystem.wait(1500);
	}
}



//
// Even shorter shortcuts
//
function r()     { return reset(); };
function a(data) { return apdu(data); };
function q()     { quit(); };



//
// Display help to user
//
function help() {
        print("q | quit                 Quit shell");
        print("r | reset                Reset card in reader");
        print("a | apdu(string)         Send APDU to card");
        print("print(string, ..)        Print string(s)");
        print("load(file)               Load and execute file");
        print("assert(expression, ..)   Assert that expressions are all true");
        print("defineClass(file)        Load Java class defining native objects");
        print("restart                  Restart shell (clears all variables)\n");
        print("or any other valid ECMAScript expression.");
        print("See doc/index.html for the complete documentation.\n");
        print("If this is the first time you use the Smart Card Shell and you want");
        print("to try it out, then insert a card into your reader and enter");
        print(" load(\"tools/explore.js\")");
}


// All GP classes report errors through GPError
defineClass("de.cardcontact.scdp.engine.Shell");
defineClass("de.cardcontact.scdp.gp.GPError");
defineClass("de.cardcontact.scdp.gp.GPSystem");
defineClass("de.cardcontact.scdp.gp.ByteString");
defineClass("de.cardcontact.scdp.gp.GPByteBuffer");
defineClass("de.cardcontact.scdp.gp.GPAtr");
defineClass("de.cardcontact.scdp.gp.Card");
defineClass("de.cardcontact.scdp.gp.GPKey");
defineClass("de.cardcontact.scdp.gp.GPCrypto");
defineClass("de.cardcontact.scdp.gp.GPXML");
defineClass("de.cardcontact.scdp.gp.GPTLV");
defineClass("de.cardcontact.scdp.gp.GPTLVList");
defineClass("de.cardcontact.scdp.gp.Application");
defineClass("de.cardcontact.scdp.gp.GPApplication");
defineClass("de.cardcontact.scdp.gp.GPSecurityDomain");
defineClass("de.cardcontact.scdp.gp.GPSecureChannel");
defineClass("de.cardcontact.scdp.gp.GPScp02");
defineClass("de.cardcontact.scdp.gp.GPScp03");
defineClass("de.cardcontact.scdp.gp.ApplicationFactory");
defineClass("de.cardcontact.scdp.js.JsX509");
defineClass("de.cardcontact.scdp.js.JsCRL");
defineClass("de.cardcontact.scdp.xmldsig.JsXMLSignature");
defineClass("de.cardcontact.scdp.js.JsASN1");
defineClass("de.cardcontact.scdp.js.JsKeyStore");
defineClass("de.cardcontact.scdp.js.JsCardFile");
defineClass("de.cardcontact.scdp.js.JsIsoSecureChannel");
defineClass("de.cardcontact.scdp.js.JsOCSPQuery");
defineClass("de.cardcontact.scdp.js.JsLDAP");
defineClass("de.cardcontact.scdp.js.JsSOAPConnection");
defineClass("de.cardcontact.scdp.js.JsURLConnection");
defineClass("de.cardcontact.scdp.js.JsTLSSocket");
defineClass("de.cardcontact.scdp.cms.JsCMSSignedData");
defineClass("de.cardcontact.scdp.cms.JsCMSEnvelopedData");
defineClass("de.cardcontact.scdp.cms.JsCMSGenerator");
defineClass("de.cardcontact.scdp.pkcs11.JsPKCS11Provider");
defineClass("de.cardcontact.scdp.pkcs11.JsPKCS11Session");
defineClass("de.cardcontact.scdp.pkcs11.JsPKCS11Object");
defineClass("de.cardcontact.scdp.js.JsScript");
defineClass("de.cardcontact.scdp.cardsim.JsCardSimulationAdapter");

if (GPSystem.mapFilename("scsh/oid/oid.js")) {
	load("scsh/oid/oid.js");
}

switch(getPlatformID()) {
	case 1:
		defineClass("de.cardcontact.scdp.js.JsTask");
		break;
	case 2:
		defineClass("de.cardcontact.scdp.scsh3.OutlineNode");
		defineClass("de.cardcontact.scdp.scsh3.Dialog");
		defineClass("de.cardcontact.scdp.scsh3.AccessTerminal");
		defineClass("de.cardcontact.scdp.scsh3.Task");
		break;
}


// Load persistent settings which defines the _scsh3 object

var filename = GPSystem.mapFilename(".settings.js", GPSystem.AUTO);

if (filename) {
        if (filename.equals(GPSystem.mapFilename(".settings.js", GPSystem.SYS))) {
                GPSystem.trace(GPSystem.mapFilename(".settings.js", GPSystem.SYS));
                GPSystem.trace("Warning: File .settings.js found in installation directory !");
                GPSystem.trace("This happens, when you selected the installation directory as");
                GPSystem.trace("user directory and saved settings to the .settings.js file.");
                GPSystem.trace("In this case, the .settings.js file in the installation");
                GPSystem.trace("directory takes precendence over any other .settings.js.");
                GPSystem.trace("You should remove the .settings.js file and create/use your own");
                GPSystem.trace("user directory rather than the installation directory.");
        }
        load(filename);
} else {
        var _scsh3 = new Object();
}

_scsh3.setProperty = function(property, value) {
        this[property] = value;
        var filename = GPSystem.mapFilename(".settings.js", GPSystem.AUTO);
        if (!filename) {
                filename = GPSystem.mapFilename(".settings.js", GPSystem.USR);
        }
        var cf = new java.io.FileWriter(filename);
        cf.write("//\n");
        cf.write("// Automatically generated file - Do not change\n");
        cf.write("//\n");
        cf.write("var _scsh3 = new Object();\n");
        for (i in this) {
                if (!(this[i] instanceof Function)) {
                        cf.write("_scsh3[\"" + i + "\"] = \"" + this[i] + "\";\n");
                }
        }
        cf.close();
}
