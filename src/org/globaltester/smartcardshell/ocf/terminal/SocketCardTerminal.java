/* 
 * Project OCFSocketTerminal
 * Package com.hjp.opencard.terminal.socketterminal
 * 
 *
 * 
 * $Date: 2009/02/13 11:27:20 $
 * $Revision: 1.1 $
 * $Id: SocketCardTerminal.java,v 1.1 2009/02/13 11:27:20 hfunke Exp $
 * 
 * Copyright (c) 2006 HJP Consulting GmbH
 * Lanfert 24
 * 33106 Paderborn
 * Germany
 * All rights reserved.
 * 
 * This software is the confidential and proprietary information
 * of HJP ("Confidential Information"). You shall not disclose such
 * Confidential Information and shall use it only in accordance 
 * with the terms of the Non-Disclosure Agreement you entered 
 * into with HJP.
 * 
 */

package org.globaltester.smartcardshell.ocf.terminal;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.UnknownHostException;

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

public class SocketCardTerminal extends CardTerminal {

	private byte[] cachedATR = null;
	private String host = null;
	private PrintWriter log = null;
	private int port = 0;
	private Socket socket = null;

	/**
	 * @param name
	 *            Name of the CardTerminal class
	 * @param type
	 *            Type of CardTerminal
	 * @param device
	 *            Port of the socket to be used
	 * @param serverhost
	 *            Name of the server where the socket is made available
	 * 
	 *            e.g. SocketCardTerminal, Socket, 9876, localhost
	 */
	protected SocketCardTerminal(String name, String type, String device,
			String serverhost) {
		super(name, type, device);
		try {
			addSlots(1);
		} catch (CardTerminalException e) {
			e.printStackTrace(log);
			log.flush();
		}
		port = Integer.decode(device).intValue();

		host = serverhost;
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#close()
	 */
	@Override
	public void close() throws CardTerminalException {
		if (socket != null) {
			try {
				exchange(0, new CommandAPDU(HexString
						.parseHexString("FF000000")));
			} catch (IOException e) {
				log.println("Trace close -> exchange exception");
				e.printStackTrace(log);
				log.flush();
			}
		}
		log.close();
	}

	/**
	 * 
	 */
	private void closeSocket() {
		try {
			socket.close();
		} catch (IOException e) {
			log.println("Trace close -> socket.close exception");
			e.printStackTrace(log);
			log.flush();
		}
		socket = null;
	}

	/**
	 * @param slotID
	 * @return
	 * @throws CardTerminalException
	 */
	private byte[] connectToCard(int slotID) throws CardTerminalException {

		if (socket != null) {
			close();
			socket = null;
		}

		try {
			socket = new Socket(host, port);
		} catch (UnknownHostException e) {
			log.println("Trace connectToCard -> UnknownHostException");
			e.printStackTrace(log);
			log.flush();
			throw new CardTerminalException(e.getLocalizedMessage());
		} catch (IOException e) {
			socket = null;
			log.println("Trace connectToCard -> IOException");
			e.printStackTrace(log);
			log.flush();
			return null;
		}

		cachedATR = exchange(slotID, new CommandAPDU(HexString
				.parseHexString("FF010000")));

		return cachedATR;
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
		if (socket == null) {
			throw new CardTerminalException("No simulator serving at port");
		}
		PrintStream out = null;
		BufferedReader in = null;
		try {
			out = new PrintStream(socket.getOutputStream());
			in = new BufferedReader(new InputStreamReader(socket
					.getInputStream()));
		} catch (IOException e) {
			e.printStackTrace(log);
			log.flush();
			throw new CardTerminalException(
					"Could not open connection or connection reset");
		}

		String apduString = HexString.hexifyByteArray(apdu.getBytes());
		out.println(apduString);
		out.flush();

		String responseApduString = null;
		try {
			responseApduString = in.readLine();
		} catch (IOException e) {
			log.println("Trace exchange -> readLine exception");
			log.println("> " + apduString);
			log.println("< " + responseApduString);
			log.flush();
			e.printStackTrace(log);
			log.flush();
			throw new CardTerminalException(
					"Could not open connection or connection reset");
		}

		/*
		 * Case if the terminal sends an explicit shutdown command to the
		 * simulator.
		 */
		if ("FF000000".equalsIgnoreCase(apduString)) {
			closeSocket();
		}

		byte[] responseApdu = null;
		try {
			responseApdu = HexString.parseHexString(responseApduString);
		} catch (RuntimeException e) {
			log.println("Trace exchange -> parseHexString exception");
			e.printStackTrace(log);
			log.flush();
			throw new CardTerminalException("Malformed response by simulator");
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
			// check if ATR was already read
			// (if card is already powered)
			if (cachedATR == null) {
				// card must be previously powered
				cardID = new CardID(this, slotID, connectToCard(slotID));
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

		cachedATR = exchange(slotID, new CommandAPDU(HexString
				.parseHexString("FFFF0000")));

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
		if (socket == null) {
			connectToCard(slotID);
		}
		return socket != null;
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
	}

}
