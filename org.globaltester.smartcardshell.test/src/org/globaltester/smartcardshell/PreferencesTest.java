package org.globaltester.smartcardshell;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;
import opencard.core.service.SmartCard;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalRegistry;

import org.eclipse.core.runtime.preferences.DefaultScope;
import org.globaltester.smartcardshell.ocf.PreferencesPropertyLoader;
import org.globaltester.smartcardshell.preferences.PreferenceConstants;
import org.globaltester.smartcardshell.preferences.PreferenceInitializer;
import org.globaltester.smartcardshell.test.TestPropertyLoader;
import org.junit.AfterClass;
import org.junit.Test;
import org.osgi.service.prefs.Preferences;

/**
 * SmokeTests for the SmartCardShell-Integration
 * 
 * @author amay
 * 
 */
public class PreferencesTest {

	@AfterClass
	public static void tearDownClass() throws Exception {
		new PreferenceInitializer().initializeDefaultPreferences();
		PreferencesPropertyLoader.restartAndInitializeOCF();
	}

	@Test
	public void setPreferencesManually() throws Exception {

		// stop SmartCard to make sure current preference values will be used
		SmartCard.shutdown();

		// set values in preferences
		Preferences preferences = new DefaultScope()
				.getNode(Activator.PLUGIN_ID);
		preferences.put(PreferenceConstants.OCF_CONFIGURATION_SOURCE,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences);
		preferences.put(PreferenceConstants.OCF_OPENCARD_SERVICES,
				TestPropertyLoader.DEFAULT_SERVICES);
		preferences.put(PreferenceConstants.OCF_OPENCARD_TERMINALS,
				TestPropertyLoader.TERMINALS1);
		preferences.flush();

		// initialize OCF with values from Preferences
		PreferencesPropertyLoader.initOCF();
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
		assertEquals("Name of CardTerminal does not match", "Name1",
				testTerminal.getName());
		assertEquals("Name of CardTerminal does not match", "Type",
				testTerminal.getType());
	}

	@Test
	public void reinitOCF() throws Exception {

		// set values in preferences
		Preferences preferences = new DefaultScope()
				.getNode(Activator.PLUGIN_ID);
		preferences.put(PreferenceConstants.OCF_CONFIGURATION_SOURCE,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences);
		preferences.put(PreferenceConstants.OCF_OPENCARD_SERVICES,
				TestPropertyLoader.DEFAULT_SERVICES);
		preferences.put(PreferenceConstants.OCF_OPENCARD_TERMINALS,
				TestPropertyLoader.TERMINALS2);
		preferences.flush();

		// initialize OCF with values from Preferences
		PreferencesPropertyLoader.restartAndInitializeOCF();

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
		assertEquals("Name of CardTerminal does not match", "Name2",
				testTerminal.getName());
		assertEquals("Name of CardTerminal does not match", "Type",
				testTerminal.getType());
	}

}
