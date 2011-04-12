package org.globaltester.smartcardshell.test;

import opencard.core.util.OpenCardConfigurationProvider;
import opencard.core.util.OpenCardPropertyLoadingException;

public class TestPropertyLoader implements OpenCardConfigurationProvider {

	@Override
	public void loadProperties() throws OpenCardPropertyLoadingException {
		// TODO Auto-generated method stub

		// OpenCard.services =
		// de.cardcontact.opencard.factory.IsoCardServiceFactory \
		// opencard.opt.util.PassThruCardServiceFactory
		System.setProperty("OpenCard.services",
				"de.cardcontact.opencard.factory.IsoCardServiceFactory "
						+ "opencard.opt.util.PassThruCardServiceFactory");
		System.setProperty(
				"OpenCard.terminals",
				"org.globaltester.smartcardshell.test.TestCardTerminalFactory|Name|Type|Adress");

	}
}
