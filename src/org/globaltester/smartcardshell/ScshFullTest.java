package org.globaltester.smartcardshell;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import opencard.core.service.CardRequest;
import opencard.core.service.SmartCard;
import opencard.core.terminal.CommandAPDU;
import opencard.core.terminal.ResponseAPDU;
import opencard.core.util.HexString;
import opencard.opt.util.PassThruCardService;

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
public class ScshFullTest {

	final byte[] CMD_APDU_SELECT_MF = { (byte) 0x00, (byte) 0xA4, (byte) 0x00,
			(byte) 0x0C, (byte) 0x02, (byte) 0x3F, (byte) 0x00 };

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
	}

	@AfterClass
	public static void tearDownClass() throws Exception {
		new PreferenceInitializer().initializeDefaultPreferences();
		PreferencesPropertyLoader.restartAndInitializeOCF();
	}

	@Test
	public void transmitApdu() throws Exception {

		// Start OCF and get required card service
		SmartCard.start();
		CardRequest request = new CardRequest(CardRequest.ANYCARD, null, null);
		SmartCard card = SmartCard.waitForCard(request);
		card.reset(true);
		PassThruCardService ptcs = (PassThruCardService) card.getCardService(
				PassThruCardService.class, true);

		// prepare and transmit command
		CommandAPDU command = new CommandAPDU(CMD_APDU_SELECT_MF);
		ResponseAPDU response = ptcs.sendCommandAPDU(command);

		// asserts
		assertNotNull("No response received", response);
		assertEquals("Command returned wrong data", "90 00",
				HexString.hexify(response.getBuffer()));

	}

}
