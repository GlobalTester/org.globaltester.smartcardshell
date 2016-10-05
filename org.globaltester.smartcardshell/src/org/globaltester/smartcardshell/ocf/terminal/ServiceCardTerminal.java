package org.globaltester.smartcardshell.ocf.terminal;

import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;

import org.globaltester.simulator.Simulator;
import org.osgi.framework.FrameworkUtil;
import org.osgi.util.tracker.ServiceTracker;

import opencard.core.terminal.CardID;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CommandAPDU;
import opencard.core.terminal.ResponseAPDU;

/**
 * The class implements an OCF CardTerminal forwarding all APDUs as a string to
 * a socket and reading the response APDUs from this socket.
 * 
 * @author mjahnich
 * 
 */

public class ServiceCardTerminal extends CardTerminal {

	private byte[] cachedATR = null;
	private ServiceTracker<Simulator, Simulator> simulatorServiceTracker;
	private PrintWriter log;
	
	/**
	 * @param name
	 *            Name of the CardTerminal class
	 * @param type
	 *            Type of CardTerminal
	 * @param device
	 *            Port of the socket to be used
	 */
	protected ServiceCardTerminal(String name, String type, String device) {
		super(name, type, device);
		try {
			addSlots(1);
		} catch (CardTerminalException e) {
			e.printStackTrace(log);
			log.flush();
		}
		simulatorServiceTracker = new ServiceTracker<Simulator, Simulator>(FrameworkUtil.getBundle(this.getClass()).getBundleContext(), Simulator.class, null);
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#close()
	 */
	@Override
	public void close() throws CardTerminalException {
		if (getService() != null){
			getService().cardPowerDown();
		}
		simulatorServiceTracker.close();
		log.close();
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
		if (getService() == null || !getService().isRunning()) {
			throw new CardTerminalException("No simulator service availiable or running");
		}
		
		return getService().processCommand(apdu.getBytes());
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#getCardID(int)
	 */
	@Override
	public CardID getCardID(int slotID) throws CardTerminalException {
		CardID cardID = null;		
		if (getService() != null && getService().isRunning()) {
			// check if ATR was already read
			// (if card is already powered)
			if (cachedATR == null) {
				// card must be previously powered
				cardID = new CardID(this, slotID, getService().cardPowerUp());
			} else {
				// card was already powered
				cardID = new CardID(this, slotID, cachedATR);
			}
		} else {
			// invalidate the cached ATR
			cachedATR = null;
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
		if (getService() != null && getService().isRunning()){
			cachedATR = getService().cardReset();
		}
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
		return getService() != null && getService().isRunning();
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#open()
	 */
	@Override
	public void open() throws CardTerminalException {
		try {
			log = new PrintWriter(new BufferedWriter(new FileWriter(
					"socket.log")));
		} catch (IOException e) {
			e.printStackTrace(log);
			log.flush();
		}
		simulatorServiceTracker.open();
	}
	
	private Simulator getService(){
		return simulatorServiceTracker.getService();
	}

}
