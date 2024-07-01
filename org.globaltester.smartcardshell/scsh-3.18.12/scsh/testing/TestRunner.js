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

var TestGroup = require("scsh/testing/TestGroup").TestGroup;
var TestProcedure = require("scsh/testing/TestProcedure").TestProcedure;
var TestReport = require("scsh/testing/TestReport").TestReport;
var TestResult = require("scsh/testing/TestResult").TestResult;
var BaseTestRunner = require("scsh/testing/BaseTestRunner").TestRunner;


/**
 * Create a test runner using a Smart Card Shell outline for navigation
 *
 * @class Class implementing a graphical test runner
 * @constructor
 * @param {String} name the test suite name
 */
function TestRunner(name) {
	BaseTestRunner.call(this, name);

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

TestRunner.prototype = Object.create(BaseTestRunner.prototype);
TestRunner.constructor = TestRunner;

exports.TestRunner = TestRunner;



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
	this.view.insert(tgr.view);
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
