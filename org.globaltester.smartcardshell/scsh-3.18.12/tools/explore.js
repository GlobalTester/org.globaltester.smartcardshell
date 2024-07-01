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
 *  Generic smart card explorer
 */

load("OutlineCore.js");

function OutlineCard() {

        // Create card object
        var card = new Card(_scsh3.reader);
        this.atr = card.reset(Card.RESET_COLD);

        this.card = card;

        // Create OutlineNode object and register in object
        var view = new OutlineNode("Card");
        view.setUserObject(this);
        this.view = view;
}



//
// Expand clicked on node
//
OutlineCard.prototype.expandListener = function() {
        if (this.expanded)
                return;
                
        var view = this.view;

	//
	// Display ATR
	//
	var atrnode = new OutlineATR(this.atr);
	view.insert(atrnode.view);
        this.expanded = true;

        //
        // Explore files in MF
        //
	try	{
		var mf = new CardFile(this.card, ":3F00");
				
	        var struct = GPXML.parse("genericmf.xml");
	        this.mf = new OutlineDF(this.card, ":3F00", "MF", struct);
	        view.insert(this.mf.view);
	}
	catch(e) {
		print("Card does not seem to have a compatible MF\n" + e);
	}

        //
        // Obtain list of applications from EF_DIR
        //
        var isTransparent = true;
        try	{
		var efdir = new CardFile(this.card, ":2F00");
		var fci = efdir.getFCPBytes();
		if (fci) {
			isTransparent = efdir.isTransparent();
		} else {
			isTransparent = true;
		}
        }
        catch(e) {
                print("Card does not seem to have a compatible EF_DIR\n" + e);
                return;
        }
                
        for (var rec = 1; rec < 255; rec++) {
                var record;
                try     {
	                if (isTransparent) {
	                	record = efdir.readBinary();
	                } else {
	                        record = efdir.readRecord(rec);
	                }
                }
                catch(e) {
                        print(e);
                        break;
                }

                var tlv = new ASN1(record);
                
                var label = null;
                var aid = null;
                        
                for (var i = 0; i < tlv.elements; i++) {
                        var t = tlv.get(i);
                        switch(t.tag) {
                        case 0x50:
                                label = t.value.toString(UTF8);
                                break;
                        case 0x4F:
                                aid = t.value;
                                break;
                        }
                }

                if (label && aid) {
                        var applentry;

                       	if (!label) {
                       		if (!aid) {
                       			label = "Invalid entry in EF.DIR";
                       		} else {
                       			label = aid.toString(HEX);
                       		}
                       	}
                        	
			applentry = new OutlineNode(label);
			applentry.insert(tlv);
			view.insert(applentry);
                }
                
                if (efdir.isTransparent())
                	break;
        }
}





//
// Outline root node erzeugen
// 
var cardoutline = new OutlineCard();

cardoutline.view.show();
