package org.globaltester.smartcardshell.test;

import opencard.core.terminal.CardID;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CommandAPDU;
import opencard.core.terminal.ResponseAPDU;
import de.cardcontact.tlv.HexString;

/**
 * The class implements an OCF CardTerminal forwarding all APDUs as a string to
 * a socket and reading the response APDUs from this socket.
 * 
 * @author mjahnich
 * 
 */

public class TestCardTerminal extends CardTerminal {

	private byte[] aTR = "TestATR".getBytes();
	
	/**
	 * @param name
	 *            Name of the CardTerminal class
	 * @param type
	 *            Type of CardTerminal
	 * @param address
	 *            Port of the socket to be used
	 * 
	 *            e.g. SocketCardTerminal, Socket, 9876, localhost
	 */
	protected TestCardTerminal(String name, String type, String address) {
		super(name, type, address);
		try {
			addSlots(1);
		} catch (CardTerminalException e) {
			e.printStackTrace();
		}
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#close()
	 */
	@Override
	public void close() throws CardTerminalException {
		
	}

	/**
	 * @param slotID
	 * @return
	 * @throws CardTerminalException
	 */
	private byte[] connectToCard(int slotID) throws CardTerminalException {

		return aTR;
	}

	/**
	 * @param slotID
	 * @param apdu
	 * @return
	 * @throws CardTerminalException
	 */
	private byte[] exchange(int slotID, CommandAPDU apdu)
			throws CardTerminalException {
		if (slotID != 0) {
			throw new CardTerminalException("Unknown slot");
		}

		String responseApduString = "9000";
		byte[] responseApdu = null;
		try {
			responseApdu = HexString.parseHexString(responseApduString);
		} catch (RuntimeException e) {
			e.printStackTrace();
		}
		return responseApdu;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#getCardID(int)
	 */
	@Override
	public CardID getCardID(int slotID) throws CardTerminalException {
		CardID cardID = null;

		if (isCardPresent(slotID)) {
			cardID = new CardID(this, slotID, connectToCard(slotID));
		} 
		
		return cardID;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#internalReset(int, int)
	 */
	@Override
	protected CardID internalReset(int slotID, int ms)
			throws CardTerminalException {

		return this.getCardID(slotID);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#internalSendAPDU(int,
	 * opencard.core.terminal.CommandAPDU, int)
	 */
	@Override
	protected ResponseAPDU internalSendAPDU(int slotID, CommandAPDU apdu, int ms)
			throws CardTerminalException {

		return new ResponseAPDU(exchange(slotID, apdu));
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#isCardPresent(int)
	 */
	@Override
	public boolean isCardPresent(int slotID) throws CardTerminalException {
		return true;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#open()
	 */
	@Override
	public void open() throws CardTerminalException {
		
	}

}
