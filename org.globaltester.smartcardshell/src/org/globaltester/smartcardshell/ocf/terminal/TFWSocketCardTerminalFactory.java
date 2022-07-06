package org.globaltester.smartcardshell.ocf.terminal;

import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CardTerminalFactory;
import opencard.core.terminal.CardTerminalRegistry;
import opencard.core.terminal.TerminalInitException;

public class TFWSocketCardTerminalFactory implements CardTerminalFactory {
	private static final int TERMINAL_HOST_ENTRY = 3;

	@Override
	public void close() throws CardTerminalException {}

	@Override
	public void createCardTerminals(CardTerminalRegistry cardTerminalRegistry, String[] terminalInfo)
			throws CardTerminalException, TerminalInitException {
		if (terminalInfo.length < 4) {
			throw new TerminalInitException("Insufficient parameters to identify terminal (TFWSocketCardTerminal|Socket|port|host");
		}
		
		// Check type (we might change this in the future to avoid conflicts with SocketCardTerminal
		if (terminalInfo[TERMINAL_TYPE_ENTRY].equals("Socket")) {
			// Create and register terminal instance
			cardTerminalRegistry.add(new TFWSocketCardTerminal(
					terminalInfo[TERMINAL_NAME_ENTRY],
					terminalInfo[TERMINAL_TYPE_ENTRY],
					terminalInfo[TERMINAL_ADDRESS_ENTRY],
					terminalInfo[TERMINAL_HOST_ENTRY])
			);
		} else {
			throw new TerminalInitException("Type unknown: " + terminalInfo[TERMINAL_NAME_ENTRY]);
		}
	}

	@Override
	public void open() throws CardTerminalException {}

}
