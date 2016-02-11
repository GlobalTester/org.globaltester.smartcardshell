/*
 * Project OCFSocketTerminal Package com.hjp.opencard.terminal.socketterminal
 * 
 * 
 * 
 * $Date: 2009/02/13 11:27:20 $ $Revision: 1.1 $ $Id:
 * SocketCardTerminalFactory.java,v 1.1 2009/02/13 11:27:20 hfunke Exp $
 * 
 * Copyright (c) 2006 HJP Consulting GmbH Lanfert 24 33106 Paderborn Germany All
 * rights reserved.
 * 
 * This software is the confidential and proprietary information of HJP
 * ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the
 * Non-Disclosure Agreement you entered into with HJP.
 */

package org.globaltester.smartcardshell.ocf.terminal;

import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CardTerminalFactory;
import opencard.core.terminal.CardTerminalRegistry;
import opencard.core.terminal.TerminalInitException;

/**
 * The class description goes here
 * 
 * @author mjahnich
 * 
 */
public class SocketCardTerminalFactory implements CardTerminalFactory {

	private static final int TERMINAL_HOST_ENTRY = 3;

	/**
	 * 
	 */
	public SocketCardTerminalFactory() {
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminalFactory#close()
	 */
	public void close() throws CardTerminalException {
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see
	 * opencard.core.terminal.CardTerminalFactory#createCardTerminals(opencard
	 * .core.terminal.CardTerminalRegistry, java.lang.String[])
	 */
	public void createCardTerminals(CardTerminalRegistry ctr,
			String[] terminalInfo) throws CardTerminalException,
			TerminalInitException {
		// check for minimal parameter requirements
		if (terminalInfo.length < 4)
			throw new TerminalInitException(
					"at least 4 parameters necessary"
							+ " to identify the terminal (SocketCardTerminal|Socket|Port|Serverhost)");

		// check the given type
		if (terminalInfo[1].equals("Socket")) {

			// creates the terminal instance
			// and registers to the CardTerminalRegistry
			ctr.add(new SocketCardTerminal(terminalInfo[TERMINAL_NAME_ENTRY],
					terminalInfo[TERMINAL_TYPE_ENTRY],
					terminalInfo[TERMINAL_ADDRESS_ENTRY],
					terminalInfo[TERMINAL_HOST_ENTRY]));
			// these four TERMINAL variables are
			// defined in CardTerminalFactory
		} else
			throw new TerminalInitException("Type unknown: "
					+ terminalInfo[TERMINAL_NAME_ENTRY]);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminalFactory#open()
	 */
	public void open() throws CardTerminalException {
	}

}
