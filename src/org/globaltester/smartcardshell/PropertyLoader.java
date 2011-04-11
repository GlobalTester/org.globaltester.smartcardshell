package org.globaltester.smartcardshell;

import opencard.core.util.OpenCardConfigurationProvider;
import opencard.core.util.OpenCardPropertyLoadingException;

public class PropertyLoader implements OpenCardConfigurationProvider {

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
				"de.cardcontact.opencard.terminal.smartcardio.SmartCardIOFactory|*|PCSC10-NOPOLL");
		// "com.hjp.opencard.terminal.socketterminal.SocketCardTerminalFactory|SocketCardTerminal|Socket|9876|localhost"

	}
}
