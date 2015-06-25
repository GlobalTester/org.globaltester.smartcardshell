package org.globaltester.smartcardshell;

import static org.junit.Assert.assertEquals;
import opencard.core.service.SmartCard;

import org.globaltester.cardconfiguration.CardConfig;
import org.globaltester.smartcardshell.ocf.PreferencesPropertyLoader;
import org.globaltester.smartcardshell.preferences.PreferenceInitializer;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;
import org.mozilla.javascript.Context;

/**
 * Test on the implementaiton of the SkriptRunner
 * 
 * @author amay
 * 
 */
public class ScriptRunnerTest {
	
	@BeforeClass
	public static void setUpClass() throws Exception {
		// make sure OCF is initialized with test values
		if (SmartCard.isStarted()) {
			SmartCard.shutdown();
		}

		// initialize OCF
		System.setProperty("OpenCard.loaderClassName",
				org.globaltester.smartcardshell.test.TestPropertyLoader.class
						.getName());
		SmartCard.start();
	}

	@AfterClass
	public static void tearDownClass() throws Exception {
		new PreferenceInitializer().initializeDefaultPreferences();
		PreferencesPropertyLoader.restartAndInitializeOCF();
	}

	@Test
	public void testInitialCardConfig() throws Exception {

		// activate Rhino JS Context
		RhinoJavaScriptAccess rhinoAccess = new RhinoJavaScriptAccess();
		Context cx = rhinoAccess.activateContext(false);

		// init JS ScriptRunner
		ScriptRunner sr = new ScriptRunner(cx, "");
		sr.init(cx);
		sr.initCard(cx, "card", new CardConfig());

		String result = sr.executeCommand(cx,
				"card.gt_getCardConfig(\"ICAO9303\",\"MRZ\")");

		// exit the JavaScript context
		rhinoAccess.exitContext();

		// asserts
		assertEquals("Returned default MRZ does not match", "P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<C11T002JM4D<<9608122F1310317<<<<<<<<<<<<<<<6", result);
	}

	/**
	 * Tests if the class loaders for smartcardshell protocol extensions
	 * were properly loaded using BAC as an example by executing a "new ...BAC()"
	 * command.
	 * @throws Exception if the "new" command could not properly be executed 
	 * (or sth. went wrong when activating the context) 
	 */
	@Test
	public void testProtocolClassLoader() throws Exception {

		// activate Rhino JS Context
		RhinoJavaScriptAccess rhinoAccess = new RhinoJavaScriptAccess();
		Context cx = rhinoAccess.activateContext(false);

		// init JS ScriptRunner
		ScriptRunner sr = new ScriptRunner(cx, "");

		// If the class loader for BAC was not activated, this will throw an exception:
		String s = "new Packages.org.globaltester.smartcardshell.protocols.bac.BAC();";
		sr.executeCommand(cx, s);

		// exit the JavaScript context
		rhinoAccess.exitContext();
	}

}
