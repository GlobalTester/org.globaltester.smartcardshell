package org.globaltester.smartcardshell.test;

import opencard.core.util.OpenCardConfigurationProvider;
import opencard.core.util.OpenCardPropertyLoadingException;

public class TestPropertyLoader implements OpenCardConfigurationProvider {

	public static final String DEFAULT_SERVICES = "de.cardcontact.opencard.factory.IsoCardServiceFactory "
			+ "opencard.opt.util.PassThruCardServiceFactory";
	public static final String DEFAULT_TERMINALS = "org.globaltester.smartcardshell.test.TestCardTerminalFactory|Name|Type|Adress";
	public static final String TERMINALS1 = "org.globaltester.smartcardshell.test.TestCardTerminalFactory|Name1|Type|Adress";
	public static final String TERMINALS2 = "org.globaltester.smartcardshell.test.TestCardTerminalFactory|Name2|Type|Adress";

	@Override
	public void loadProperties() throws OpenCardPropertyLoadingException {
		System.setProperty("OpenCard.services", DEFAULT_SERVICES);
		System.setProperty("OpenCard.terminals", DEFAULT_TERMINALS);
	}
}
