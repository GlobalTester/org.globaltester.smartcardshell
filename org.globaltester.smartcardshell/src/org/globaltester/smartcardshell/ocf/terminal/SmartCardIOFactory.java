/*
 *  ---------
 * |.##> <##.|  Open Smart Card Development Platform (www.openscdp.org)
 * |#       #|  
 * |#       #|  Copyright (c) 1999-2008 CardContact Software & System Consulting
 * |'##> <##'|  Andreas Schwier, 32429 Minden, Germany (www.cardcontact.de)
 *  --------- 
 *
 *  This file is part of OpenSCDP.
 *
 *  OpenSCDP is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License version 2 as
 *  published by the Free Software Foundation.
 *
 *  OpenSCDP is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with OpenSCDP; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 */
//FIXME LICENSE parts of this code are copied from package de.cardcontact.opencard.terminal.smartcardio; 
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
