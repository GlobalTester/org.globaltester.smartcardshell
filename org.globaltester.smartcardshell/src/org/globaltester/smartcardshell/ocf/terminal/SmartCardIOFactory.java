/*
 * Original Copyright (c) 1999-2008 CardContact Software & System Consulting
 * Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
 * Open Smart Card Development Platform (www.openscdp.org)
 * 
 * The following code is a derivative work of the code from the Open Smart Card Development Platform, 
 * which is licensed GPLv2. This code therefore is also licensed under the terms 
 * of the GNU Public License, verison 2.
 */

package org.globaltester.smartcardshell.ocf.terminal;

import java.security.NoSuchAlgorithmException;
import java.util.List;

import javax.smartcardio.CardException;
import javax.smartcardio.CardTerminal;
import javax.smartcardio.TerminalFactory;

import org.eclipse.core.runtime.Platform;
import org.globaltester.lib.smartcardio.Smartcardio;
import org.globaltester.logging.BasicLogger;
import org.globaltester.smartcardshell.Activator;
import org.globaltester.smartcardshell.preferences.PreferenceConstants;

import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CardTerminalFactory;
import opencard.core.terminal.CardTerminalRegistry;
import opencard.core.terminal.TerminalInitException;
import opencard.core.util.Tracer;

/**
 * Factory that creates a CardTerminal object for each card reader listed via the javax.smartcardio interface.
 * 
 */
public class SmartCardIOFactory implements CardTerminalFactory {

	private final static Tracer ctracer = new Tracer(SmartCardIOFactory.class);



	@Override
	public void close() throws CardTerminalException {
		// Empty
	}

	/**
	 * Creates an instance for each card listed.
	 */
	@Override
	public void createCardTerminals(CardTerminalRegistry ctr, String[] terminalInfo)
			throws CardTerminalException, TerminalInitException {

		String terminalType = "SmartCardIO";
		
		if (terminalInfo.length >= 2) {
			terminalType = terminalInfo[1];
		}
		try	{
			String smartcardImplemenatation = Platform.getPreferencesService().getString(
					Activator.PLUGIN_ID,
					PreferenceConstants.OCF_SMARTCARD_IMPLEMENTATION, "JAVA", null);
			TerminalFactory factory;
			if(smartcardImplemenatation.equals("JAVA" )) {
				factory = TerminalFactory.getDefault();
			}
			else {
				factory = TerminalFactory.getInstance("PC/SC", null, new Smartcardio());
			}
			
			List<CardTerminal> terminals = factory.terminals().list();
			for (CardTerminal ct : terminals) {
				ctr.add(new SmartCardIOTerminal(ct.getName(), terminalType, "", ct));	
			}
			
			BasicLogger.log(this.getClass(), factory.toString());
		}
		catch(CardException | NoSuchAlgorithmException e) {
			ctracer.error("createCardTerminals", e);
		}
	}



	@Override
	public void open() throws CardTerminalException {
		// Empty
	}
}
