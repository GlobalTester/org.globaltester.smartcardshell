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
public class ServiceCardTerminalFactory implements CardTerminalFactory {
	
	/**
	 * 
	 */
	public ServiceCardTerminalFactory() {
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
		if (terminalInfo.length != 0)
			throw new TerminalInitException(
					"no parameters necessary");
		ctr.add(new ServiceCardTerminal("Service Card Terminal", "secunet OSGi Simulator", "0"));
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminalFactory#open()
	 */
	public void open() throws CardTerminalException {
	}

}
