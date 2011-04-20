package org.globaltester.smartcardshell;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import opencard.core.service.SmartCard;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalRegistry;

import org.globaltester.smartcardshell.preferences.PreferenceInitializer;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

/**
 * SmokeTests for the SmartCardShell-Integration
 * 
 * @author amay
 * 
 */
public class ScshSmokeTest {

	@BeforeClass
	public static void setUpClass() throws Exception {
		// make sure OCF is initialized with test values
		SmartCard.shutdown();

		// initialize OCF
		System.setProperty("OpenCard.loaderClassName",
				org.globaltester.smartcardshell.test.TestPropertyLoader.class
						.getName());
	}

	@AfterClass
	public static void tearDownClass() throws Exception {
		new PreferenceInitializer().initializeDefaultPreferences();
		PreferencesPropertyLoader.restartAndInitializeOCF();
	}

	@Test
	public void terminalsAvailable() throws Exception {

		// Start OCF, check for terminals and shutdown OCF
		SmartCard.start();
		boolean terminalsAvailable = CardTerminalRegistry.getRegistry()
				.getCardTerminals().hasMoreElements();

		CardTerminal testTerminal = null;
		if (terminalsAvailable) {
			testTerminal = (CardTerminal) CardTerminalRegistry.getRegistry()
					.getCardTerminals().nextElement();
		}

		// asserts
		assertTrue("No card terminals available", terminalsAvailable);
		assertNotNull("First CardTerminal not available", testTerminal);
		assertEquals("Name of CardTerminal does not match", "Name",
				testTerminal.getName());
		assertEquals("Name of CardTerminal does not match", "Type",
				testTerminal.getType());

	}

}
