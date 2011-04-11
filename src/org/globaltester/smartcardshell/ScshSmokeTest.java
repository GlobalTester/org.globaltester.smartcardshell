package org.globaltester.smartcardshell;

import static org.junit.Assert.assertTrue;
import opencard.core.service.SmartCard;
import opencard.core.terminal.CardTerminalRegistry;

import org.junit.Test;

/**
 * SmokeTests for the SmartCardShell-Integration
 * 
 * @author amay
 * 
 */
public class ScshSmokeTest {

	@Test
	public void terminalsAvailable() throws Exception {

		//initialize OCF
		System.setProperty("OpenCard.loaderClassName",
				org.globaltester.smartcardshell.PropertyLoader.class.getName());

		
		//Start OCF, check for terminals and shutdown OCF
		SmartCard.start();
		boolean terminalsAvailable = CardTerminalRegistry.getRegistry()
				.getCardTerminals().hasMoreElements();
		SmartCard.shutdown();

		//assert
		assertTrue("No card terminals available", terminalsAvailable);

	}

}
