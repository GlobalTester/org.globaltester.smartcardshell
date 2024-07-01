/**
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
 * @fileoverview Test Report
 */

function TestReport() {
	this.testResults = [];
}

exports.TestReport = TestReport;


TestReport.prototype.addResult = function(result) {
	this.testResults.push(result);
}



TestReport.prototype.writeReport = function(filename) {
	var xml = <testreport/>

	for (var i = 0; i < this.testResults.length; i++) {
		var r = this.testResults[i];
		var x = r.toXML();
		xml.testcaseresult += x;
	}

	var os = new java.io.FileOutputStream(filename);
	var fw = new java.io.OutputStreamWriter(os, "UTF-8");

	fw.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
	fw.write("<?xml-stylesheet type=\"text/xsl\" href=\"docreport.xsl\" ?>\n");

	fw.write(xml.toXMLString());
	fw.close();
}
