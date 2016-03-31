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

import java.util.List;

import javax.smartcardio.CardException;
import javax.smartcardio.CardTerminal;
import javax.smartcardio.TerminalFactory;

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
			TerminalFactory factory = TerminalFactory.getDefault();
			List<CardTerminal> terminals = factory.terminals().list();
			for (CardTerminal ct : terminals) {
				ctr.add(new SmartCardIOTerminal(ct.getName(), terminalType, "", ct));	
			}
		}
		catch(CardException ce) {
			ctracer.error("createCardTerminals", ce);
		}

		// TODO Auto-generated method stub

	}



	@Override
	public void open() throws CardTerminalException {
		// Empty
	}
}
