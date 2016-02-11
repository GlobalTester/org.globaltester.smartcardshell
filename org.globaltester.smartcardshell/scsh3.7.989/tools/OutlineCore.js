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
 */



load("FCPDecorator.js");
load("CRTDecorator.js");
load("ARRDecorator.js");


//
// CTOR - ATR Outline
// 
function OutlineATR(atr) {
	this.atr = atr;

        // Create OutlineNode object and register in ATR object
        var view = new OutlineNode("ATR=" + this.atr.toByteString().toString(HEX));
        view.setIcon("atr");
        view.setUserObject(this);
        this.view = view;
}


OutlineATR.prototype.selectedListener = function() {
	print(this.atr);
}


//
// CTOR - FCP Outline
//
function OutlineFCP(fcp) {
	this.fcp = fcp;

        // Create OutlineNode object and register in FCP object
        var view = new OutlineNode("FCP=" + this.fcp.toString(HEX));
        view.setIcon("header");
        view.setUserObject(this);
        this.view = view;
        
        try	{
        	var asn = new ASN1(this.fcp);
        	FCPDecorator(asn);
		view.insert(asn);
        }
        catch(e) {
        	print("Unable to decode FCP structure");
        }
}



//
// CTOR - Outline node for DFs
//
function OutlineDF(card, id, name, profile) {
        this.card = card;
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
        var eflist = this.profile.EF;
        
        try	{
        	var df = new CardFile(this.card, this.id);
		this.df = df;
				
		var fcp = df.getFCPBytes();
		if (fcp && (fcp.length > 1)) {
			var fcpmodel = new OutlineFCP(fcp);
			view.insert(fcpmodel.view);	
		}
				
		for (var i = 0; i < eflist.length; i++) {
		        var ef = new OutlineEF(this.df, eflist[i].name, eflist[i]);
		        view.insert(ef.view);
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
function OutlineEF(df, name, profile) {
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
	
	if (efdesc.fid.length > 2) {  // Select by FID or SFI
		var fcp = ef.getFCPBytes();
		if (fcp && (fcp.length > 1)) {
			var fcpmodel = new OutlineFCP(fcp);
			view.insert(fcpmodel.view);
			isTransparent = ef.isTransparent();
		} else {
			isTransparent = (efdesc.type == "T");
		}
	}
		
        if (isTransparent) {
        	var filesize = -1;
        	if (fcp) {
	        	filesize = ef.getLength();
	       	
	        	if (filesize > 1024)
	        		print("Please wait, reading " + filesize + " bytes...");
	        } else {
        		print("Please wait, reading card...");
	        }
        		
		try	{
			if (filesize > 0) {
				print("reading " + filesize);
		                var bs = ef.readBinary(0, filesize);
		        } else {
		                var bs = ef.readBinary();
		        }
	        }
	        catch(e) {
	       		print(e);
	       		this.expanded = true;
	       		return;
		}

		var bindata = new DataOutline(bs, efdesc.format);
		view.insert(bindata.view);
		
        } else {
                for (var rec = 1; rec < 255; rec++) {
                        try     {
                                ef.readRecord(rec);
                                var record = new OutlineRecord(ef, rec, efdesc);
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
// CTOR - Outline for records in an EF
//
function OutlineRecord(ef, no, efdesc) {
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

	var bindata = new DataOutline(bs, this.efdesc.format);
	view.insert(bindata.view);
        
        this.expanded = true;
}



//
// CTOR - Binary data outline
//
function DataOutline(data, format) {
	this.data = data;

	var ddata = data;
	if (ddata.length > 256) {
		ddata = data.bytes(0, 256);
	}
	
	var view = new OutlineNode(ddata.toString(HEX));
        view.setIcon("binary");
	view.setUserObject(this);
	this.view = view;
	
	if (((format == "asn1") || (format == "tlvlist")) && (data.length >= 2)) {
                var total = data.length;
                
                while(total >= 2) {
                	try	{
	                        var asn = new ASN1(data);
	                }
	            	catch(e) {
	            		print("Exception creating ASN.1 object: " + e);
	            		break;
	            	}
                        view.insert(asn);
                        total -= asn.size;
                        
                        if (format == "asn1") {
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



DataOutline.prototype.selectedListener = function() {
	print("--------------------------------------------------------------------------------");
	print(this.data);
}
