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
 * @fileoverview Test runner framework
 */



/**
 * Create a test runner using a Smart Card Shell outline for navigation
 *
 * @class Class implementing a graphical test runner
 * @constructor
 * @param {String} name the test suite name
 */
function TestRunner(name) {

	this.name = name;
	this.testGroupRunners = new Array();
	this.testProcedures = new Array();
	this.testMapper = new Array();
	this.testGroupPrototype = new TestGroup();
	this.testProcedurePrototype = new TestProcedure();
	this.testReport = new TestReport();
	
	// Create root node and set as view
	var view = new OutlineNode(name, true);
	if (typeof(view.expand) == "function") {
		view.setContextMenu(["run", "clear", "report", "expand", "collapse"]);
	} else {
		view.setContextMenu(["run", "clear", "report"]);
	}
	view.setUserObject(this);
	this.view = view;

	view.show();
}



/**
 * Set directory to write reports
 *
 * @param {String} dir the directory to store reports
 */
TestRunner.prototype.setReportDirectory = function(dir) {
	this.reportDir = dir;
}



/**
 * Event listener for actions selected from context menu
 *
 * @param {Object} source the outline node for which the action was invoked
 * @param {String} actionName the name of the action selected
 */
TestRunner.prototype.actionListener = function(source, actionName) {
	switch(actionName) {
	case "run" :
		this.run();
		break;
	case "clear" :
		this.clearResults();
		break;
	case "report" :
		this.report();
		break;
	case "expand" :
		this.expandAll();
		break;
	case "collapse" :
		this.collapseAll();
		break;
	}
}



/**
 * Expand all test groups
 */
TestRunner.prototype.expandAll = function() {
	for each (c in this.view.childs) {
		c.expand();
	}
}



/**
 * Collapse all test groups
 */
TestRunner.prototype.collapseAll = function() {
	for each (c in this.view.childs) {
		c.collapse();
	}
}



/**
 * Write test report
 */
TestRunner.prototype.report = function() {
	var fn = GPSystem.dateTimeByteString().toString(HEX) + "_TestReport.xml";
	if (this.reportDir == undefined) {
		var fn = GPSystem.mapFilename(fn, GPSystem.USR);
	} else {
		var fn = this.reportDir + "/" + fn;
	}
	var fn = Dialog.prompt("Select output file for report", fn, null, "*.xml");
	if (fn != null) {
		this.testReport.writeReport(fn);
		print("Report written to " + fn);
	}
}



/**
 * Add a test group to the test runner
 *
 * <p>This call will iterate through all test cases and locate used procedures and steps.</p>
 *
 * @param {TestGroup} testGroup the test group object
 */
TestRunner.prototype.addTestGroup = function(testGroup) {
	var tgrs = this.testGroupRunners;
	
	tgr = new TestGroupRunner(this, testGroup);

	tgrs.push(tgr);

	var view = this.view;	
	view.insert(tgr.view);
}



/**
 * Create test group from XML file and add to test runner
 *
 * @param {String} file the file name containing the test group
 * @param {Object} parameter the parameter object
 */
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



/**
 * Add a test procedure constructor to the list
 *
 * <p>Use the getName() method to obtain the test procedure name</p>
 *
 * @param {TestProcedure} proc the test procedure object
 */
TestRunner.prototype.addTestProcedure = function(proc) {
	var name = proc.getName();
	if (name) {
		this.testProcedures[name] = proc;
	}
}



/**
 * Create test procedure from XML file and add to test runner
 *
 * @param {String} file the file name containing the test procedure
 * @param {Object} parameter the parameter object
 */
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



/**
 * Return constructor of test procedure
 *
 * @param {String} name the name of the test procedure
 * @type TestProcedure
 * @return the test procedure object
 */
TestRunner.prototype.getTestProcedure = function(name) {
	return this.testProcedures[name];
}



/**
 * Add test to test mapper, which maps test unique id to listening object
 *
 * @param {String} name the unique test name
 * @param {Object} listener the listener object implementing the clearResults(), enable(), isEnabled(), hasPassed() and hasFailed() methods
 */
TestRunner.prototype.addTest = function(name, listener) {
	this.testMapper[name] = listener;
}



/**
 * Run all test groups
 */
TestRunner.prototype.run = function() {
	for (var i = 0; i < this.testGroupRunners.length; i++) {
		var testGroupRunner = this.testGroupRunners[i];
		testGroupRunner.run();
	}
}



/** 
 * Clear result of last test run
 */
TestRunner.prototype.clearResults = function() {
	for (var i in this.testMapper) {
		var listener = this.testMapper[i];
		if (listener) {
			listener.clearResult();
		}
	}
	this.testReport = new TestReport();
}



/**
 * Enable or disable test
 *
 * @param {String} name the unique test name
 * @param {Boolean} state the enable / disable state
 */
TestRunner.prototype.enable = function(name, state) {
	var listener = this.testMapper[name];
	if (listener && listener.enable) {
		return listener.enable(state);
	} else {
		throw new GPError("TestRunner", GPError.OBJECT_NOT_FOUND, 0, name);
	}
}



/**
 * isEnabled query from TestGroup runner
 *
 * @param {String} name the unique test name
 * @type boolean
 * @return true if the test is enabled
 */
TestRunner.prototype.isEnabled = function(name) {
	var listener = this.testMapper[name];
	if (listener) {
		return listener.isEnabled();
	}
	return true;
}



/**
 * hasPassed Listener
 * 
 * @param {String} name the unique test name
 * @param {String} log the test log
 */
TestRunner.prototype.hasPassed = function(name, log) {
	var listener = this.testMapper[name];
	if (listener) {
		listener.hasPassed(log);
		
		if (listener.getXML) {
			var result = new TestResult(name, true, log, listener.getXML());
			this.testReport.addResult(result);
		}
	} else {
		print("No receiver for passed notification : " + name);
		for (var i in this.testMapper) {
			print("- " + i);
		}
	}
}



/**
 * hasFailed Listener
 * 
 * @param {String} name the unique test name
 * @param {String} log the test log
 */
TestRunner.prototype.hasFailed = function(name, log) {
	var listener = this.testMapper[name];
	if (listener) {
		listener.hasFailed(log);
		if (listener.getXML) {
			var result = new TestResult(name, false, log, listener.getXML());
			this.testReport.addResult(result);
		}
	}
}



/**
 * Create a TestGroupRunner containing the TestCases
 *
 * @class Class implementing a harness to run test groups
 * @constructor
 * @param {TestRunner} testRunner the associated test runner
 * @param {TestGroup= testGroup the test group
 */
function TestGroupRunner(testRunner, testGroup) {
	this.testRunner = testRunner;
	this.testGroup = testGroup;
	
	var view = new OutlineNode(testGroup.getName());
	view.setContextMenu(["run"]);
	view.setUserObject(this);
	
	this.view = view;

	var testcases = testGroup.getTestCaseNames();
	
	for (var i = 0; i < testcases.length; i++) {
		var tcr = new TestCaseRunner(this, testcases[i]);
		view.insert(tcr.view);
	}
}



/**
 * Event listener for context menu
 *
 * @param {Object} source the outline node for which the action was invoked
 * @param {String} actionName the name of the action selected
 */
TestGroupRunner.prototype.actionListener = function(source, action) {
	switch(action) {
	case "run" : 
		this.run();
		break;
	}
}



/**
 * Run this test group
 */
TestGroupRunner.prototype.run = function() {
	var test = this.testGroup;
	
	test.run(this.testRunner);
}




/**
 * Construct a TestCaseRunner object
 *
 * @class Class implementing a test case harness
 * @constructor
 * @param {TestGroupRunner} the parent test group runner
 * @param {String} the test case name
 */
function TestCaseRunner(testGroupRunner, testCase) {
	this.testGroupRunner = testGroupRunner;
	this.testCase = testCase;
	this.selected = true;

	var testRunner = testGroupRunner.testRunner;
	testRunner.addTest(testGroupRunner.testGroup.getName() + "/" + testCase, this);

	this.xml = testGroupRunner.testGroup.getTestCase(testCase).XML;

	var view = new OutlineNode(testCase + " " + this.xml.name.elementValue);

	view.setUserObject(this);
	view.setIcon("selected");
	view.setContextMenu(["select", "deselect", "run"]);
	this.view = view;

	var testGroup = testGroupRunner.testGroup;

	var testprocedures = testGroup.getUsedTestProceduresForTestCase(testCase);

	if (testprocedures) {
		for (var i = 0; i < testprocedures.length; i++) {
			var tpr = new TestProcedureRunner(this, testprocedures[i]);
			view.insert(tpr.view);
		}
	}
}



/**
 * Event listener for context menu
 *
 * @param {Object} source the outline node for which the action was invoked
 * @param {String} actionName the name of the action selected
 */
TestCaseRunner.prototype.actionListener = function(source, actionName) {
	print("Action " + actionName);
	switch(actionName) {
	case "select":
		this.selected = true;
		source.setIcon("selected");
		break;
	case "deselect":
		this.selected = false;
		source.setIcon("deselected");
		break;
	case "run":
		this.run();
		break;
	}
}



/**
 * Run this test case
 */
TestCaseRunner.prototype.run = function() {
	var test = this.testGroupRunner.testGroup;
	
	test.runTestCase(this.testCase, this.testGroupRunner.testRunner);
}



/**
 * Tell test runner if case is enabled
 *
 * @type boolean
 * @return true if enabled
 */
TestCaseRunner.prototype.isEnabled = function() {
	return this.selected;
}



/**
 * Add a log entry to the test case node
 *
 * @param {String} log the test log
 */
TestCaseRunner.prototype.addLog = function(log) {
	var view = this.view;
	var lognode = new TestLogFile(this, log);
	this.log = lognode;
	view.insert(lognode.view);
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



/**
 * Listener for passed notifications
 *
 * @param {String} log the test log
 */
TestCaseRunner.prototype.hasPassed = function(log) {
	this.failed = false;
	var view = this.view;
	view.setIcon("passed");
	this.addLog(log);
}



/**
 * Listener for failed notifications
 *
 * @param {String} log the test log
 */
TestCaseRunner.prototype.hasFailed = function(log) {
	this.failed = true;
	var view = this.view;
	view.setIcon("failed");
	this.addLog(log);
}



/**
 * Clear result of test
 */
TestCaseRunner.prototype.clearResult = function() {
	this.failed = false;
	var view = this.view;
	if (this.selected) {
		view.setIcon("selected");
	} else {
		view.setIcon("deselected");
	}
}



/**
 * Enable or disable test
 *
 * @param {Boolean} state true for enabled
 */
TestCaseRunner.prototype.enable = function(state) {
	var view = this.view;
	this.selected = state;
	if (this.selected) {
		view.setIcon("selected");
	} else {
		view.setIcon("deselected");
	}
}




/**
 * Constructor for test log entry in outline
 */
function TestLogFile(parent, log) {
	this.log = log;
	
	var view = new OutlineNode("Log from " + Date());
	this.view = view;
	view.setUserObject(this);
}



//
// Listener for node selection - Display log
//
TestLogFile.prototype.selectedListener = function() {
	print("--------------------------------------------------------------------------------");
	print(this.log);
}



// --------------------------------------------
// Constructor for a TestProcedureRunner object
//
function TestProcedureRunner(testCaseRunner, testProcedure) {
	this.testCaseRunner = testCaseRunner;
	this.testProcedure = testProcedure;
	
	var view = new OutlineNode(testProcedure);
	this.view = view;

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
			view.insert(tpsr.view);
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
	
	var view = new OutlineNode(testStep);
	this.view = view;

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
	var view = this.view;
	view.setIcon("passed");
}



//
// Clear test result display
//
TestStepRunner.prototype.clearResult = function() {
	var view = this.view;
	view.setIcon();
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
