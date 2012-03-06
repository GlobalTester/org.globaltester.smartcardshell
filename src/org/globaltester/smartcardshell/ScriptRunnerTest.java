package org.globaltester.smartcardshell;

import static org.junit.Assert.assertEquals;

import static org.globaltester.cardconfiguration.CardConfigManager.DEFAULT_CARD_CONFIG;
import opencard.core.service.SmartCard;

import org.globaltester.cardconfiguration.CardConfigManager;
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

		// init JS ScriptRunner and Context
		Context cx = Context.enter();
		ScriptRunner sr = new ScriptRunner(cx, "");
		sr.init(cx);
		sr.initCard(cx, "card", CardConfigManager.get(DEFAULT_CARD_CONFIG));

		String result = sr.executeCommand(cx,
				"card.gt_getCardConfig(\"ICAO9303\",\"MRZ\")");

		// asserts
		assertEquals("Returned default MRZ does not match", "P<D<<MUSTERMANN<<ERIKA<<<<<<<<<<<<<<<<<<<<<<C11T002JM4D<<9608122F1310317<<<<<<<<<<<<<<<6", result);
	}

}
