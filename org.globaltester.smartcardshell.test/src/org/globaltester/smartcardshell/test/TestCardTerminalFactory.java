package org.globaltester.smartcardshell.test;

import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CardTerminalFactory;
import opencard.core.terminal.CardTerminalRegistry;
import opencard.core.terminal.TerminalInitException;

/**
 * CardTerminalFactory that returns virtual CardTerminals used in unit tests for
 * SmartCardShell
 * 
 * @author amay
 * 
 */
public class TestCardTerminalFactory implements CardTerminalFactory {

	/**
	 * 
	 */
	public TestCardTerminalFactory() {
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
			throw new TerminalInitException("at least 3 parameters necessary"
					+ " to identify the terminal (Name|Type|Address)");

		// creates the terminal instance
		// and registers to the CardTerminalRegistry
		ctr.add(new TestCardTerminal(terminalInfo[TERMINAL_NAME_ENTRY],
				terminalInfo[TERMINAL_TYPE_ENTRY],
				terminalInfo[TERMINAL_ADDRESS_ENTRY]));
		// these TERMINAL variables are
		// defined in CardTerminalFactory
		
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminalFactory#open()
	 */
	public void open() throws CardTerminalException {
	}

}
