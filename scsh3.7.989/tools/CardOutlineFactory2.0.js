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
 *  Core classes to construct card outlines
 *
 * Changes to Version 1.0
 *
 *  - Added support for nested DF structures (requires updated application profiles)
 *  - Added support for PKCS#15 / ISO 7816-15 formatted cards
 *
 */



load("tools/FCPDecorator.js");
load("tools/CRTDecorator.js");
load("tools/ARRDecorator.js");
load("tools/p15classes.js");


//
// CTOR - OutlineCard default
//
function OutlineCard(outlineFactory, card, applicationFactory, aidlist) {

	this.factory = outlineFactory;
	this.card = card;
	this.af = applicationFactory;
	this.presetaidlist = aidlist;
		
	this.atr = card.reset(Card.RESET_COLD);

	this.pkcs15 = new PKCS15(card);
	
	// Create OutlineNode object and register in card object
		
	var name = card.profile.CardManufacturerProduct.Name;

	if (!name) {
		name = "Card";
	}
	
	var view = new OutlineNode(name);
	view.setUserObject(this);
	this.view = view;
}



//
// Expand clicked on node
//
// Read application list from EF_DIR or from card profile
//
OutlineCard.prototype.expandListener = function() {
	if (this.expanded)
		return;
				
	var view = this.view;

	//
	// Display ATR
	//
	var atrnode = this.factory.newOutlineATR(this.atr);
	
	view.insert(atrnode.view);

	//
	// Get list of application instances from card profile
	//
	var applicationInstances = this.card.profile.ApplicationInstances.ApplicationInstance;

	//
	// Make sure that we got a list
	//	
	assert(applicationInstances instanceof Array);

	//
	// Try reading the EF_DIR
	//
	var hasEFDIR = true;

	var aidlist = new Array();
	
	try	{
		this.pkcs15.readApplicationDirectory();
		aidlist = this.pkcs15.getAidList();
		aidlist["3F00"] = null;
	}
	catch(e) {
		print("Exception selecting EF_DIR. Assuming no EF_DIR...\n" + e);
		hasEFDIR = false;

		//
		// Create application list from card profile
		//
		for (var aid in  applicationInstances) {
			if (aid == "arrayIndex")
				continue;
			aidlist[aid] = null;
		}
	}

	var sortedaidlist = new Array();
	for (var aid in aidlist) {
		sortedaidlist.push(aid);
	}
	
	if (this.presetaidlist) {
		for (var i = 0; i < this.presetaidlist.length; i++) {
			sortedaidlist.push(this.presetaidlist[i]);
		}
	}
	
	sortedaidlist.sort();
	
	for (var i = 0; i < sortedaidlist.length; i++) {
		var aid = sortedaidlist[i];
		print(aid);
		var at = aidlist[aid];
		var applinstance = applicationInstances[aid.toString(HEX)];
		if (applinstance) {
/*
			print("from Card Profile: " + applinstance);
			print("  Label     : " + applinstance.Label);
			print("  AID       : " + applinstance.AID);
			print("  ProfileID : " + applinstance.ProfileID);
*/
			var uniqueId = new ByteString(applinstance.ProfileID, HEX);
					
			var instance = this.af.getApplicationInstance(new Object(), new ByteString(aid, HEX), this.card, uniqueId);
				
			var struct = null;
			
			if (instance.profile.DataStructure) {
				struct = instance.profile.DataStructure;
			}
			
			var path;
			if (aid.length <= 4) {
				path = ":" + aid;
			} else {
				path = "#" + aid;
			}
			
			var applentry;
			if (struct) {
				applentry = this.factory.newOutlineDF(this.card, null, path, applinstance.Label, struct);
			} else {
				applentry = this.factory.newOutlineApplet(instance);
			}
			view.insert(applentry.view);
	  	} else {
	  		print("No profile found for aid " + aid);
	  	}
	  	if (at) {
			if ((!at.ddo) && ((aid == "A000000063504B43532D3135") || (aid.substr(0, 10) == "E828BD080F"))) {
				var t = new ASN1(new ByteString("7300", HEX));
				at.ddo = new PKCS15_CIODDO(t);
		  	}
		  	if (at.ddo) {
				var applentry;
				applentry = this.factory.newOutlinePKCS15(this.pkcs15, aid, at);
				view.insert(applentry.view);
	  		}
	  	}
	}

	this.expanded = true;
}





//
// CTOR - ATR Outline
// 
function OutlineATR(factory, atr) {
	if (arguments.length == 0)
		return;
		
	this.factory = factory;
	this.atr = atr;

	// Create OutlineNode object and register in ATR object
	var view = new OutlineNode("ATR=" + this.atr.toByteString().toString(HEX));
	view.setIcon("atr");
	view.setUserObject(this);
	view.setToolTip("Click to decode ATR");
	this.view = view;
}


OutlineATR.prototype.selectedListener = function() {
	print(this.atr);
}





//
// CTOR - FCP Outline
//
function OutlineFCP(factory, fcp) {
	if (arguments.length == 0)
		return;

	this.factory = factory;
	this.fcp = fcp;

	// Create OutlineNode object and register in FCP object
	var view = new OutlineNode("FCP=" + this.fcp.toString(HEX));
	view.setIcon("header");
	view.setUserObject(this);
	this.view = view;

	if ((fcp.byteAt(0) == 0x62) ||
		(fcp.byteAt(0) == 0x64) ||
		(fcp.byteAt(0) == 0x6F)) {
		try	{
			var asn = new ASN1(this.fcp);
			FCPDecorator(asn);
			view.insert(asn);
		}
		catch(e) {
			print(e);
			print("Unable to decode FCP structure");
		}
	} else {
	}
}





//
// CTOR - Outline node for DFs
//
function OutlineDF(factory, card, parentdf, id, name, profile) {
	if (arguments.length == 0)
		return;
		
	this.factory = factory;
	this.card = card;
	this.parentdf = parentdf;
	this.id = id;

	// Create OutlineNode object and register in OutlineDF object
	var view = new OutlineNode(name, true);
	view.setUserObject(this);
	this.view = view;
	
	this.profile = profile;
}





//
// Event handler for expand notifications
//
OutlineDF.prototype.expandListener = function() {

	if (this.expanded)
		return;

	var view = this.view;

	var eflist = null;
	if (this.profile && this.profile.FileStructure) {
		eflist = this.profile.FileStructure.EF;
	}
	
	var dflist = null;
	if (this.profile && this.profile.DirectoryStructure) {
		dflist = this.profile.DirectoryStructure.DF;
	}
	
	try	{
		var df;
		
		if (this.parentdf) {
			df = new CardFile(this.parentdf.df, this.id);
			} else {
			df = new CardFile(this.card, this.id);
			}
		this.df = df;
				
		var fcp = df.getFCPBytes();
		if (fcp && (fcp.length > 1)) {
			var fcpmodel = this.factory.newOutlineFCP(fcp);
			view.insert(fcpmodel.view);	
		}
	
		if (dflist) {				
			for (var i = 0; i < dflist.length; i++) {
				var dfp = dflist[i];
			
				var sdf = this.factory.newOutlineDF(this.card, this, ":" + dfp.fid, dfp.name, dfp);
				view.insert(sdf.view);
			}
		}

		if (eflist) {
			for (var i = 0; i < eflist.length; i++) {
				var ef = this.factory.newOutlineEF(this.df, eflist[i].name, eflist[i]);
				view.insert(ef.view);
			}
		}
	}
	catch(e) {
		print(e);
	}
	
	this.expanded = true;
}





//
// CTOR - Outline node for EFs
//
function OutlineEF(factory, df, name, profile) {
	if (arguments.length == 0)
		return;

	this.factory = factory;
	this.df = df;

	// Create OutlineNode object and register in OutlineEF object
	var view = new OutlineNode(name, true);
	view.setIcon("document");
	view.setUserObject(this);
	this.view = view;
	
	this.profile = profile;
}



//
// Event handler for expand notification
//
OutlineEF.prototype.expandListener = function() {
	if (this.expanded)
		return;

	var view = this.view;
	var efdesc = this.profile;

	try	{
		var ef = new CardFile(this.df, ":" + efdesc.fid);
	}
	catch(e) {
		print(e);
		return;
	}
		
	var isTransparent = true;
	var fcp = ef.getFCPBytes();
	var filelength = -1;
	if (fcp && (fcp.length > 1)) {
		var fcpmodel = this.factory.newOutlineFCP(fcp);
		view.insert(fcpmodel.view);
		isTransparent = ef.isTransparent();
		filelength = ef.getLength();
	} else {
		isTransparent = (efdesc.type == "T");
	}
		
	if (isTransparent) {
		try	{
			if (filelength > 0) {
				var bs = ef.readBinary(0, filelength);
			} else {
				var bs = ef.readBinary();
			}
		}
		catch(e) {
			print(e);
			this.expanded = true;
			return;
		}

		var bindata = this.factory.newDataOutline(bs, efdesc.format);
		view.insert(bindata.view);
		
	} else {
		for (var rec = 1; rec < 255; rec++) {
			try {
				ef.readRecord(rec);
				var record = this.factory.newOutlineRecord(ef, rec, efdesc);
				view.insert(record.view);
			}
			catch(e) {
				if ((e instanceof GPError) && (e.reason == 0x6A83))
					break;
				print(e);
				break;
			}
		}
	}
	
	this.expanded = true;
}




//
// CTOR - Outline node for data object retrievable with GET_DATA
//
function OutlineDataObject(factory, df, id, name, format) {
	if (arguments.length == 0)
		return;

	this.factory = factory;
	this.df = df;
	this.id = id;
	this.format = format;
		
	// Create OutlineNode object and register in OutlineEF object
	print(name + "(" + id.toString(16) + ")");
	var view = new OutlineNode(name + "(" + id.toString(16) + ")", true);
	view.setIcon("document");
	view.setUserObject(this);
	this.view = view;
}



//
// Event handler for expand notification
//
OutlineDataObject.prototype.expandListener = function() {
	if (this.expanded)
		return;

	var view = this.view;

	var card = this.df.card;
	
	var bs = card.sendApdu(0x00, 0xCA, this.id >> 8, this.id & 0xFF, 0);
	
	if (card.SW != 0x9000) {
		var bs = card.sendApdu(0x80, 0xCA, this.id >> 8, this.id & 0xFF, 0);
	}
	
	if (card.SW != 0x9000) {
		print("Error getting object: " + card.SWMSG);
	} else {
		var bindata = this.factory.newDataOutline(bs, this.format);
		view.insert(bindata.view);
	}
	
	this.expanded = true;
}




//
// CTOR - Outline for records in an EF
//
function OutlineRecord(factory, ef, no, efdesc) {
	if (arguments.length == 0)
		return;

	this.factory = factory;
	this.ef = ef;
	this.no = no;
	this.efdesc = efdesc;
		
	// Create OutlineNode object and register in OutlineRecord object
	var view = new OutlineNode("Record#" + no, true);
	view.setIcon("record");
	view.setUserObject(this);
	this.view = view;
}



//
// Expand event handler for records
//
OutlineRecord.prototype.expandListener = function() {
	if (this.expanded)
		return;

	var view = this.view;
	var ef = this.ef;

	var bs = ef.readRecord(this.no);

	var bindata = this.factory.newDataOutline(bs, this.efdesc.format);
	view.insert(bindata.view);
	
	this.expanded = true;
}





//
// CTOR - Binary data outline
//
function DataOutline(factory, data, format) {
	if (arguments.length == 0)
		return;

	this.factory = factory;
	this.data = data;
	this.format = format;

	var ddata = data;
	if (ddata.length > 256) {
		ddata = data.bytes(0, 256);
	}
	
	var view = new OutlineNode(ddata.toString(HEX));
	view.setIcon("binary");
	view.setUserObject(this);
	view.setToolTip("Select format from context menu");
	view.setContextMenu(DataOutline.ctxMenuList);
	this.view = view;
	this.decorate(format);
}


DataOutline.ctxMenuList = ["as Hexdump", "as ASN1", "as X509"];

DataOutline.prototype.decorate = function(format) {

	var view = this.view;
	var data = this.data;

	if (format && ((format.substr(0, 4) == "asn1") || (format.substr(0, 7) == "tlvlist")) && (data.length >= 2)) {
		var i = format.indexOf(".");

		if ((i > 0) && (format.substr(i + 1) == "striprecordheader")) {
			data = data.bytes(2);
		}
		
		var total = data.length;
		
		while(total >= 2) {
			try	{
				var asn = new ASN1(data);
			}
			catch(e) {
				print("Error in TLV structure: " + e);
				return;
			}
			
			this.asn = asn;
			this.asn1DecoratorHook(format);
			view.insert(asn);
			total -= asn.size;
			
			if (format.substr(0, 3) == "asn") {
				break;
			}

			data = data.bytes(asn.size);
			if ((data.length == 0) || (data.byteAt(0) == 0x00) || (data.byteAt(0) == 0xFF)) {
				break;
			}
		}
			
		if (total > 0) {
			var sparecontent = new OutlineNode(total + " spare bytes");
			view.insert(sparecontent);
		}
	}
}



DataOutline.prototype.asn1DecoratorHook = function(format) {
	var i = format.indexOf(".");
	
	if (i > 0) {
		switch(format.substr(i + 1)) {
		case "arr" :
			ARRDecorator(this.asn);
			break;
		}
	}
}



DataOutline.prototype.actionListener = function(node, action) {
	print("--------------------------------------------------------------------------------");

	switch(action) {
		case DataOutline.ctxMenuList[0]:
			print(this.data);
			break;
		case DataOutline.ctxMenuList[1]:
			var asn;
			try	{
				asn = new ASN1(this.data);
				print(asn);
			}
			catch(e) {
				print("Error in TLV structure: " + e);
				return;
			}
			break;
		case DataOutline.ctxMenuList[2]:
			try 	{
				var x509 = new X509(this.data);
				print(x509.toString());
			}
			catch(e) {
				print(e);
			}
			break;
	}
}



//
// CTOR - Outline node for PKCS15 structures
//
function OutlinePKCS15(factory, pkcs15, aid, at) {
	if (arguments.length == 0)
		return;
		
	this.factory = factory;
	this.pkcs15 = pkcs15;
	this.aid = aid;
	this.at = at;

	var name = this.at.label;
	if (!name) {
		name = aid;
	}
	
	name = "PKCS#15 \"" + name + "\"";
	
	// Create OutlineNode object and register in OutlineDF object
	var view = new OutlineNode(name, true);
	view.setUserObject(this);
	this.view = view;
}





//
// Event handler for expand notifications
//
OutlinePKCS15.prototype.expandListener = function() {

	if (this.expanded)
		return;

	var view = this.view;
	var at = this.at;
	
	if (!at.ddo.ciaInfoPath) {
		// Set a default path 5032 to EF.CIAInfo
		var tlv = new ASN1(new ByteString("300404025032", HEX));
		at.ddo.ciaInfoPath = new PKCS15_Path(tlv);
		at.ddo.ciaInfoPath.aid = "#" + this.aid;
	}
	
	var cia = this.pkcs15.getCIAInfo(at.ddo.ciaInfoPath);

	var label = cia.label;
	if (!label) {
		label = "CIAInfo";
	} else {
		label = "CIAInfo \"" + label + "\"";
	}

	cia.tlv.setName(label);
	view.insert(cia.tlv);

	if (!at.ddo.odfPath) {
		// Set a default path 5031 to EF.OD
		var tlv = new ASN1(new ByteString("300404025031", HEX));
		at.ddo.odfPath = new PKCS15_Path(tlv);
		at.ddo.odfPath.aid = "#" + this.aid;
	}
	
	this.pkcs15.readObjectListForApplication(at);

	for (var i = 0; i < at.objlist.length; i++) {
		var o = at.objlist[i];
		
		var label = o.label;
		if (!label) {
			label = o.type;
		} else {
			label = o.type + " \"" + label + "\"";
		}

		if ((o.type == "X509Certificate") || (o.type == "TrustedX509Certificate") || (o.type == "UsefulX509Certificate")) {
			var onode = new OutlineNode(label, true);
			view.insert(onode);
			o.tlv.setName("CIO");
			onode.insert(o.tlv);
			
			if (o.value && (o.value instanceof PKCS15_Path)) {
				try	{
					var bs = this.pkcs15.readCardObject(this.pkcs15.df, o.value);
					var bindata = this.factory.newDataOutline(bs, "asn1.x509");
					onode.insert(bindata.view);
				}
				catch(e) {
					print("Unable to read certificate: " + e);
				}
			}
		} else {		
			o.tlv.setName(label);
			view.insert(o.tlv);
		}
	}
	
	this.expanded = true;
}





//
// CTOR - OutlineFactory
// Derive from this class to include custom made outline elements
//
function CardOutlineFactory() {
	
}



//
// Method to create new OutlineATR object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newOutlineATR = function(atr) {
	return new OutlineATR(this, atr);
}



//
// Method to create new OutlineDF object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newOutlineDF = function(card, parentdf, id, name, profile) {
	return new OutlineDF(this, card, parentdf, id, name, profile);
}



//
// Method to create new OutlineApplet object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newOutlineApplet = function(instance) {
	throw new GPError("CardOutlineFactory", GPError.INVALID_USAGE, 0, "Must overwrite newOutlineApplet to use explorer functionality");
}



//
// Method to create new OutlinePKCS15 object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newOutlinePKCS15 = function(pkcs15, aid, at) {
	return new OutlinePKCS15(this, pkcs15, aid, at);
}



//
// Method to create new OutlineEF object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newOutlineEF = function(df, name, profile) {
	return new OutlineEF(this, df, name, profile);
}



//
// Method to create new OutlineDataObject object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newOutlineDataObject = function(df, id, name, format) {
	return new OutlineDataObject(this, df, id, name, format);
}



//
// Method to create new OutlineFCP object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newOutlineFCP = function(fcp) {
	return new OutlineFCP(this, fcp);
}



//
// Method to create new OutlineRecord object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newOutlineRecord = function(ef, no, efdesc) {
	return new OutlineRecord(this, ef, no, efdesc);
}



//
// Method to create new DataOutline object
//
// Overwrite if you want to tailor this behaviour
//
CardOutlineFactory.prototype.newDataOutline = function(data, format) {
	return new DataOutline(this, data, format);
}
