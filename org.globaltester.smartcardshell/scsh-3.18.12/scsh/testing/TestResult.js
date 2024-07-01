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
 * @fileoverview Test Result
 */

function TestResult(id, verdict, log, tcxml) {
	this.id = id;
	this.verdict = verdict;
	this.log = log;
	this.tcxml = tcxml;
}

exports.TestResult = TestResult;


TestResult.prototype.toXML = function() {
	var source = this.id.split("/")[0];
	var sourceid = this.id.split("/")[1];

	var xml = <testcaseresult id={this.id} source={source} sourceid={sourceid}/>;

	xml.name = <name>{this.tcxml.name.elementValue}</name>;

	xml.verdict = <verdict>{ this.verdict ? "Passed" : "Failed" }</verdict>;
	xml.log = <log>{ "\n" + this.log + "\n" }</log>;
	return xml;
}
