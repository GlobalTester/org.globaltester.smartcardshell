package org.globaltester.smartcardshell.ocf.terminal;

import opencard.core.terminal.CardID;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CommandAPDU;
import opencard.core.terminal.ResponseAPDU;
import de.cardcontact.tlv.HexString;

/**
 * The class implements an OCF CardTerminal always containing a card, that
 * rejects all incoming APDUs with 6f00.
 * 
 * @author amay
 * 
 */

public class DummyCardTerminal extends CardTerminal {
	private byte[] dummyATR = HexString.parseHexString("3BE800008131FE0044756d6d7943617264");

	/**
	 * @param name
	 *            Name of the CardTerminal class
	 * @param type
	 *            Type of CardTerminal
	 * @param device
	 *            unused

	 */
	protected DummyCardTerminal(String name, String type, String device) {
		super(name, type, device);
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

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#getCardID(int)
	 */
	@Override
	public CardID getCardID(int slotID) throws CardTerminalException {
		return new CardID(this, slotID, dummyATR);
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
		return new ResponseAPDU(new byte[]{0x6f,0x00});
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
