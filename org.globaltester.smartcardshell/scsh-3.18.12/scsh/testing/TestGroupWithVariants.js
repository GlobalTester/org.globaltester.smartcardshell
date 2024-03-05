/**
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|
 * |#       #|  Copyright (c) 1999-2023 CardContact Software & System Consulting
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
 * @fileoverview A test group with a generator for test cases
 */

function TestGroupWithVariants(name, parameter) {
	TestGroup.call(this, name, parameter);
}

TestGroupWithVariants.prototype = Object.create(TestGroup.prototype);
TestGroupWithVariants.constructor = TestGroupWithVariants;

exports.TestGroupWithVariants = TestGroupWithVariants;



/**
 * Create test group from XML file and add to test runner
 *
 * @param {String} file the file name containing the test group
 * @param {Object} parameter the parameter object
 */
TestGroupWithVariants.createTestGroupFromXML = function (file, parameter) {
	default xml namespace = "http://www.w3.org/1999/xhtml";

	// Parse XML file.
	var parser = new GPXML();
 	parser.defineArrayElement("/testgroup", "testcase,function,", "id,Name");
	parser.defineArrayElement("/testgroup/testcase/procedures", "procedure");
	var xml = parser.parse(file);

	// Determine CTOR function
	var ctor = xml.constructor.Script;
	if (!ctor) {
		// Use a default constructor unless defined in XML profile
		ctor = function(name, parameter) { TestGroupWithVariants.call(this, name, parameter); };
	}

	// Make CTOR available in scope object
	// this[xml.id] = ctor;

	// Set correct prototype object
	ctor.prototype = new TestGroupWithVariants();
	ctor.prototype.constructor = ctor;
	ctor.prototype.usedProcedures = new Array();
	ctor.prototype.config = new Array();

	var gen = xml.generator.Script;
	gen.call(this); // Set this.variants

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

	// Add test cases to prototype object
	var testcases = xml.testcase;
	for (var i in testcases) {
		if (i != "arrayIndex") {
			if (parseInt(i) + "" == i) {
				print("Attribute id must be a string, but is a number (" + i + " in " + file + ")");
				print("Due to automatic string to number conversion in JavaScript, the test case");
				print("can not be properly deserialized as object map. Numeric id are deserialized");
				print("as a array indices. Please change the id to a string, e.g. by prefixing with a 0.");
				throw new Error("TestCase id parsing error");
			}

			// Generate a test case for each variant

			for (var j = 0; j < this.variants.length; j++) {
				var variant = this.variants[j];

				var s = testcases[i].Script.bind(tc); // Create a copy of the script function
				s.variant = variant;

				// Set variables

				var name = testcases[i].name.elementValue;
				var description = testcases[i].description.p.elementValue;

				for (var v in variant) {
					var key = "${variant." + v + "}";

					if (name.indexOf(key) > 0) {
						name = name.replace(key, variant[v]);
					}

					if (description.indexOf(key) > 0) {
						description = description.replace(key, variant[v]);
					}
				}

				// Create a copy of the XML element

				s.XML = {
					id : i,
					name: {
						elementValue: name
					},
					description: {
						p: {
							elementValue: description
						}
					},
				};

				var caseName = i + "/" + variant.id;
				ctor.prototype["case" + caseName] = s;

				if (testcases[i].procedures) {
					var procedures = testcases[i].procedures.procedure;
					ctor.prototype.usedProcedures[caseName] = new Array();

					for (var p = 0; p < procedures.length; p++) {
						ctor.prototype.usedProcedures[caseName].push(procedures[p].id);
					}
				}
			}
		}
	}

	return tc;
}



/**
 * Run a single test case. This method is called internally. Use {@link #runTestCase} for running a single test case.
 *
 * @private
 * @type boolean
 * @return true if test passed
 */
TestGroupWithVariants.prototype.runTestCaseInternal = function(casename, runner) {
	var result = false;
	this.currentTestCase = this.name + "/" + casename;
	this.testRunner = runner;

//	this.logfile = "";

	var starttime = new Date();
	GPSystem.markTrace();
	logentry = "+ TestCase " + this.currentTestCase + " started " + starttime;
	print(logentry);
	this.log(logentry);
	try {
		this.setUp();
		var func = this.getTestCase(casename);
		func.call(this, func.variant);
		this.tearDown();
		var endtime = new Date();
		logentry = "+ TestCase " + this.currentTestCase + " completed on " + endtime + " after " + (endtime.valueOf() - starttime.valueOf()) + " ms";
		print(logentry);
		this.log(logentry);
		if (runner) {
			var logfile = GPSystem.copyTrace();
			runner.hasPassed(this.currentTestCase, logfile);
		}
		result = true;
	}
	catch(e) {
		var endtime = new Date();
		logentry = "+ TestCase " + this.currentTestCase + " failed on " + endtime + " after " + (endtime.valueOf() - starttime.valueOf()) + " ms";
		print(logentry);
		this.log(logentry);

		logentry = "  ### - " + e;
		print(logentry);
		this.log(logentry);
		for (j in e) {
			logentry = "  ### " + j + " = " + e[j];
			print(logentry);
			this.log(logentry);
		}

		if (runner) {
			var logfile = GPSystem.copyTrace();
			runner.hasFailed(this.currentTestCase, logfile);
		}
		try	 {
			this.tearDown();
		}
		catch(e) {
			print("Exception in tearDown() " + e);
		}
	}
	return result;
}
