package org.globaltester.smartcardshell.ocf.terminal;

import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CardTerminalFactory;
import opencard.core.terminal.CardTerminalRegistry;
import opencard.core.terminal.TerminalInitException;

/**
 * OCF CardTerminalFactory for the DummyCardTerminal
 * 
 * @author amay
 * 
 */
public class DummyCardTerminalFactory implements CardTerminalFactory {

	public DummyCardTerminalFactory() {
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
		if (terminalInfo.length < 3)
			throw new TerminalInitException(
					"at least 3 parameters necessary"
							+ " to identify the terminal (DummyCardTerminal|Dummy|1)");

		// check the given type
		if (terminalInfo[1].equals("Dummy")) {

			// creates the terminal instance
			// and registers to the CardTerminalRegistry
			ctr.add(new DummyCardTerminal(terminalInfo[TERMINAL_NAME_ENTRY],
					terminalInfo[TERMINAL_TYPE_ENTRY],
					terminalInfo[TERMINAL_ADDRESS_ENTRY]));

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
