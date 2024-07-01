//
//  ---------
// |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
// |#       #|  
// |#       #|  Copyright (c) 1999-2006 CardContact Software & System Consulting
// |'##> <##'|  Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
//  --------- 
//
//  This file is part of OpenSCDP.
//
//  OpenSCDP is free software; you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation; either version 2 of the License, or
//  (at your option) any later version.
//
//  OpenSCDP is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with OpenSCDP; if not, write to the Free Software
//  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
//
//  Simple test runner framework





// ---------------------------
// Create a test runner object
//
function TestRunner(name) {

	this.name = name;
	this.testGroupRunners = new Array();
	this.testProcedures = new Array();
	this.testMapper = new Array();
	this.testGroupPrototype = new TestGroup();
	this.testProcedurePrototype = new TestProcedure();
	this.testReport = new TestReport();
}



//
// Add a test group to the test runner
// This will iterate through all test cases and locate used procedures and steps
//
TestRunner.prototype.addTestGroup = function(testGroup) {
	var tgrs = this.testGroupRunners;
	
	tgr = new TestGroupRunner(this, testGroup);

	tgrs.push(tgr);
}



//
// Create test group from XML file and add to test runner
// 
TestRunner.prototype.addTestGroupFromXML = function (file, parameter) {
	// Parse XML file.
	var parser = new GPXML();
	parser.defineArrayElement("/testgroup", "testcase,function", "id,Name");
	parser.defineArrayElement("/testgroup/testcase/procedures", "procedure");
	var xml = parser.parse(file);
	
	// Determine CTOR function
	var ctor = xml.constructor.Script;
	if (!ctor) {
		// Use a default constructor unless defined in XML profile
		ctor = function(name, parameter) { TestGroup.call(this, name, parameter); };
	}
	
	// Make CTOR available in scope object
	// this[xml.id] = ctor;
	
	// Set correct prototype object
	ctor.prototype = new TestGroup();
	ctor.prototype.constructor = ctor;
	ctor.prototype.usedProcedures = new Array();
	
	// Add test cases to prototype object
	var testcases = xml.testcase;
	for (var i in testcases) {
		if (i != "arrayIndex") {
			var s = testcases[i].Script;
			s.XML = testcases[i];
			ctor.prototype["case" + i] = s;
			if (testcases[i].procedures) {
				var procedures = testcases[i].procedures.procedure;
				ctor.prototype.usedProcedures[i] = new Array();
				
				for (var p = 0; p < procedures.length; p++) {
					ctor.prototype.usedProcedures[i].push(procedures[p].id);
				}
			}
		}
	}
	
	// Add setup function to prototype object
	if (xml.setup) {
		ctor.prototype["setUp"] = xml.setup.Script;
	}
	
	// Add teardown function to prototype object
	if (xml.teardown) {
		ctor.prototype["tearDown"] = xml.teardown.Script;
	}
	
	// Add functions to prototype object
	var functions = xml["function"];
	for (var i in functions) {
		if (i != "arrayIndex") {
			var s = functions[i].Script;
			ctor.prototype[i] = s;
		}
	}
	
	ctor.XML = xml;
	
	var tc = new ctor(xml.id, parameter);
	
	this.addTestGroup(tc);
}



//
// Add a test procedure constructor to the list
// Use the getName() method to obtain the test procedure name
//
TestRunner.prototype.addTestProcedure = function(proc) {
	var name = proc.getName();
	if (name) {
		this.testProcedures[name] = proc;
	}
}



//
// Create test procedure from XML file and add to test runner
// 
TestRunner.prototype.addTestProcedureFromXML = function (file, parameter) {
	// Parse XML file.
	var parser = new GPXML();
	parser.defineArrayElement("/testprocedure", "teststep,function", "id,Name");
	var xml = parser.parse(file);

	// Determine CTOR function
	var ctor = xml.constructor.Script;
	if (!ctor) {
		// Use a default constructor unless defined in XML profile
		ctor = function(testgroup, name, parameter) { TestProcedure.call(this, testgroup, name, parameter); };
	}

	// Make CTOR available in scope object
	// this[xml.id] = ctor;
	
	// Set correct prototype object
	ctor.prototype = new TestProcedure();
	ctor.prototype.constructor = ctor;
	var teststeps = xml.teststep;
	for (var i in teststeps) {
		if (i != "arrayIndex") {
			var s = teststeps[i].Script;
			ctor.prototype["step" + i] = s;
		}
	}
	if (xml.setup) {
		ctor.prototype["setUp"] = xml.setup.Script;
	}
	if (xml.teardown) {
		ctor.prototype["tearDown"] = xml.teardown.Script;
	}
	
	// Add functions to prototype object
	var functions = xml["function"];
	for (var i in functions) {
		if (i != "arrayIndex") {
			var s = functions[i].Script;
			ctor.prototype[i] = s;
		}
	}

	ctor.XML = xml;
	ctor.getName = function() { return xml.id; };	

	this.testProcedures[xml.id] = ctor;
}



//
// Return constructor of test procedure
// 
TestRunner.prototype.getTestProcedure = function(name) {
	return this.testProcedures[name];
}



//
// Return number of failed tests
// 
TestRunner.prototype.getFailedCounter = function() {
	return this.failedCounter;
}



//
// Return log of last test run
// 
TestRunner.prototype.getLog = function() {
	return this.log;
}



//
// Add test to test mapper, which maps test unique id to listening object
//
TestRunner.prototype.addTest = function(name, listener) {
	this.testMapper[name] = listener;
}



//
// Run all test groups
//
TestRunner.prototype.run = function() {
	this.failedCounter = 0;
	this.log = "";
	for (var i = 0; i < this.testGroupRunners.length; i++) {
		var testGroupRunner = this.testGroupRunners[i];
		testGroupRunner.run();
	}
}



//
// Enable or disable test
//
TestRunner.prototype.enable = function(name, state) {
	var listener = this.testMapper[name];
	if (listener && listener.enable) {
		return listener.enable(state);
	} else {
		throw new GPError("TestRunner", GPError.OBJECT_NOT_FOUND, 0, name);
	}
}



//
// isEnabled query from TestGroup runner
//
TestRunner.prototype.isEnabled = function(name) {
	var listener = this.testMapper[name];
	if (listener && listener.isEnabled) {
		return listener.isEnabled();
	}
	return true;
}



//
// hasPassed Listener
//
TestRunner.prototype.hasPassed = function(name, log) {
//	print("hasPassed(" + name + ")");
	if (log) {
		this.log += log;
	}
	var listener = this.testMapper[name];
	if (listener && listener.hasPassed) {
		listener.hasPassed(log);

		if (listener.getXML) {
			var result = new TestResult(name, true, log, listener.getXML());
			this.testReport.addResult(result);
		}
	} else {
		print("No receiver for passed notification : " + name);
//		for (var i in this.testMapper) {
//			print("- " + i);
//		}
	}
}



//
// hasFailed Listener
//
TestRunner.prototype.hasFailed = function(name, log) {
//	print("hasFailed(" + name + ")");
	if (log) {
		this.log += log;
	}
	var listener = this.testMapper[name];
	if (listener && listener.hasFailed) {
		listener.hasFailed(log);

		if (listener.getXML) {
			var result = new TestResult(name, false, log, listener.getXML());
			this.testReport.addResult(result);
		}
		this.failedCounter++;
	}
}



/**
 * Write test report
 */
TestRunner.prototype.report = function(fn) {
	this.testReport.writeReport(fn);
	print("Report written to " + fn);
}



// ----------------------------------------
// Constructor for a TestGroupRunner object
//
function TestGroupRunner(testRunner, testGroup) {
	this.testRunner = testRunner;
	this.testGroup = testGroup;
	
	var testcases = testGroup.getTestCaseNames();
	
	for (var i = 0; i < testcases.length; i++) {
		var tcr = new TestCaseRunner(this, testcases[i]);
	}
}



//
// run this test group
//
TestGroupRunner.prototype.run = function() {
	var test = this.testGroup;
	
	test.run(this.testRunner);
}




// ---------------------------------------
// Constructor for a TestCaseRunner object
//
function TestCaseRunner(testGroupRunner, testCase) {
	this.testGroupRunner = testGroupRunner;
	this.testCase = testCase;
	this.selected = true;
	
	var testRunner = testGroupRunner.testRunner;
	testRunner.addTest(testGroupRunner.testGroup.getName() + "/" + testCase, this);
			
	this.xml = testGroupRunner.testGroup.getTestCase(testCase).XML;

	var testGroup = testGroupRunner.testGroup;
		
	var testprocedures = testGroup.getUsedTestProceduresForTestCase(testCase);
	
	if (testprocedures) {
		for (var i = 0; i < testprocedures.length; i++) {
			var tpr = new TestProcedureRunner(this, testprocedures[i]);
		}
	}
}



//
// Run this test case
//
TestCaseRunner.prototype.run = function() {
	var test = this.testGroupRunner.testGroup;
	
	test.runTestCase(this.testCase, this.testGroupRunner.testRunner);
}



//
// Tell test runner if case is enabled
//
TestCaseRunner.prototype.isEnabled = function() {
	return this.selected;
}



//
// Add a log entry to the test case node
//
TestCaseRunner.prototype.addLog = function(log) {
}



//
// Get log for the test case node
//
TestCaseRunner.prototype.getLog = function() {
	return this.log;
}



/**
 * Return describing XML element
 *
 * @type Object
 * @return the XML element for this test case
 */
TestCaseRunner.prototype.getXML = function() {
	return this.xml;
}



//
// Listener for passed notifications
// 
TestCaseRunner.prototype.hasPassed = function(log) {
	this.failed = false;
	this.addLog(log);
}



//
// Listener for failed notifications
// 
TestCaseRunner.prototype.hasFailed = function(log) {
	this.failed = true;
	this.addLog(log);
}



//
// Clear result of test
//
TestCaseRunner.prototype.clearResult = function() {
	this.failed = false;
}




//
// Enable or disable test
//
TestCaseRunner.prototype.enable = function(state) {
	this.selected = state;
}




// --------------------------------------------
// Constructor for a TestProcedureRunner object
//
function TestProcedureRunner(testCaseRunner, testProcedure) {
	this.testCaseRunner = testCaseRunner;
	this.testProcedure = testProcedure;
	
	var tp = this.testCaseRunner.testGroupRunner.testRunner.testProcedures[testProcedure];

	if (tp) {
		var list = new Array();
		for (var i in tp.prototype) {
			if (i.substr(0, 4) == "step") {
				var step = i.substr(4);
				list.push(step);
			}
		}

		list.sort();
		
		for (var i = 0; i < list.length; i++) {
			var tpsr = new TestStepRunner(this, list[i]);
		}
	} else {
		print("No test procedure implementation found for " + testProcedure);
	}
}




// ---------------------------------------
// Constructor for a TestStepRunner object
//
function TestStepRunner(testProcedureRunner, testStep) {
	this.testProcedureRunner = testProcedureRunner;
	this.testStep = testStep;
	
	var testCaseRunner = testProcedureRunner.testCaseRunner;	
	var testGroupRunner = testCaseRunner.testGroupRunner;
	var testRunner = testGroupRunner.testRunner;
	var testName = testGroupRunner.testGroup.getName() + "/" + 
	               testCaseRunner.testCase + "/" + 
	               testProcedureRunner.testProcedure + "/" +
	               testStep;
	               
	testRunner.addTest(testName, this);
}



//
// Receive passed notifications
//
TestStepRunner.prototype.hasPassed = function() {
}



//
// Clear test result display
//
TestStepRunner.prototype.clearResult = function() {
}


function TestReport() {
	this.testResults = [];
}



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



function TestResult(id, verdict, log, tcxml) {
	this.id = id;
	this.verdict = verdict;
	this.log = log;
	this.tcxml = tcxml;
}



TestResult.prototype.toXML = function() {
	var source = this.id.split("/")[0];
	var sourceid = this.id.split("/")[1];

	var xml = <testcaseresult id={this.id} source={source} sourceid={sourceid}/>;

	xml.name = <name>{this.tcxml.name.elementValue}</name>;

	xml.verdict = <verdict>{ this.verdict ? "Passed" : "Failed" }</verdict>;
	xml.log = <log>{ "\n" + this.log + "\n" }</log>;
	return xml;
}
