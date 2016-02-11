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

import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;

import javax.smartcardio.CardChannel;
import javax.smartcardio.CardException;

import opencard.core.terminal.CardID;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CardTerminalRegistry;
import opencard.core.terminal.CommandAPDU;
import opencard.core.terminal.Pollable;
import opencard.core.terminal.ResponseAPDU;
import opencard.core.util.Tracer;
import opencard.opt.terminal.TerminalCommand;

/**
 * Implements a wrapper card terminal for access to smart card with the javax.smartcardio interface.
 */
public class SmartCardIOTerminal extends CardTerminal implements TerminalCommand, Pollable {

	private final static Tracer ctracer = new Tracer(SmartCardIOTerminal.class);

	private boolean polling;
	private boolean powerdownRequired;
	private javax.smartcardio.CardTerminal ct;
	private javax.smartcardio.Card card;
	
	public SmartCardIOTerminal(String name, String type, String address, javax.smartcardio.CardTerminal ct) throws CardTerminalException {
		
		super(name, type, address);

		polling = !type.endsWith("-NOPOLL");	// Disable polling if type is "*-NOPOLL"

		this.ct = ct;
		this.card = null;
		this.powerdownRequired=false;
		
		addSlots(1);
	}



	@Override
	public void open() throws CardTerminalException {
		if (polling) {
			CardTerminalRegistry.getRegistry().addPollable((Pollable)this);
		}
	}



	@Override
	public void close() throws CardTerminalException {
		disconnect(true);
		if (polling) {
			CardTerminalRegistry.getRegistry().removePollable((Pollable)this);
		}
	}



	@Override
	public CardID getCardID(int slotID) throws CardTerminalException {
		
		if (!isCardPresent(slotID)) {
			ctracer.debug("getCardID", "no card in reader");
			return null;
		}
		connect();
		
		return new CardID(this, slotID, this.card.getATR().getBytes());
	}


	@Override
	protected CardID internalReset(int slot, int ms)
			throws CardTerminalException {
	
		disconnect(true);

		return getCardID(slot);
	}

	@Override
	protected ResponseAPDU internalSendAPDU(int slot, CommandAPDU capdu, int ms)
			throws CardTerminalException {
		
		connect();
		CardChannel ch = this.card.getBasicChannel();
		ByteBuffer bbrapdu = ByteBuffer.allocate(0x010000);
		int respLength;
		byte[] dst;
		
		try	{
			ByteBuffer bbcapdu = ByteBuffer.wrap(capdu.getBytes());
			respLength = ch.transmit(bbcapdu, bbrapdu);
			dst = new byte[respLength];
			bbrapdu.rewind();
			bbrapdu.get(dst, bbrapdu.position(), dst.length);
		}
		catch(CardException ce) {
			ctracer.error("internalSendAPDU", ce);
			throw new CardTerminalException("CardException in transmit(): " + ce.getMessage());
		}
		
		powerdownRequired = true;
		return new ResponseAPDU(dst);
	}


	@Override
	public boolean isCardPresent(int slotID) throws CardTerminalException {
		boolean cardPresent;
		
		try	{
			cardPresent = ct.isCardPresent();
		}
		catch(CardException ce) {
			ctracer.error("isCardPresent", ce);
			throw new CardTerminalException("CardException in isCardPresent(): " + ce.getMessage());
		}

		if (!cardPresent) {
			card = null;
		}
		return cardPresent;
	}



	/**
	 * Send control command to terminal.
	 * 
	 * The first four byte encode the PC/SC Control Code.
	 * 
	 * @param cmd the command data
	 * @return the response data
	 */
	@Override
	public byte[] sendTerminalCommand(byte[] cmd) throws CardTerminalException {
		int c = 0;
		int i = 0;
		
		for (; (i < cmd.length) && (i < 4); i++) {
			c <<= 8;
			c |= cmd[i] & 0xFF;
		}
		
		byte[] cmddata = new byte[cmd.length - i];
		System.arraycopy(cmd, i, cmddata, 0, cmd.length - i);
		
		byte[] resdata = null;
		
		try	{
			resdata = this.card.transmitControlCommand(c, cmddata);
		}
		catch(CardException ce) {
			ctracer.error("sendTerminalCommand", ce);
			throw new CardTerminalException("CardException in sendTerminalCommand(): " + ce.getMessage());
		}
		return resdata;
	}



	@Override
	public void poll() throws CardTerminalException {
		// TODO Auto-generated method stub
		
	}



	/**
	 * Connect to card, first with T=1 then with any protocol
	 * 
	 */
	private void connect() throws CardTerminalException {
		try	{
			this.card = ct.connect("T=1");
		}
		catch(CardException ce) {
			ctracer.debug("connect", ce);
			try	{
				this.card = ct.connect("*");
			}
			catch(CardException nce) {
				ctracer.error("connect", nce);
				throw new CardTerminalException("Error connecting to card: " + nce.getMessage());
			}
		}
	}

	/**
	 * Disconnect from card
	 * 
	 * @param reset
	 *            reset card if set to true
	 * @throws CardTerminalException
	 */
	private void disconnect(boolean reset) throws CardTerminalException {
		if (this.card != null) {

			try {
				// this.card.disconnect(reset);

				Class<?> cl;
				Field f;
				Method m;

				// read cardId
				Object cardId;
				cl = Class.forName("sun.security.smartcardio.CardImpl");
				f = cl.getDeclaredField("cardId");
				f.setAccessible(true);
				cardId = f.get(this.card);

				// read disposition
				Object disposition;
				cl = Class.forName("sun.security.smartcardio.PCSC");
				f = cl.getDeclaredField("SCARD_UNPOWER_CARD");
				// f = cl.getDeclaredField("SCARD_RESET_CARD");
				// f = cl.getDeclaredField("SCARD_LEAVE_CARD");
				f.setAccessible(true);
				disposition = f.get(null);

				// Execute SCardDisconnect
				cl = Class.forName("sun.security.smartcardio.PCSC");
				m = cl.getDeclaredMethod("SCardDisconnect", Long.TYPE,
						Integer.TYPE);
				m.setAccessible(true);
				m.invoke(null, cardId, disposition);

			// } catch(CardException ce) {
				// ctracer.error("disconnect", ce);
				// throw new CardTerminalException("Error connecting to card: "
				// + ce.getMessage());
			} catch (IllegalArgumentException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (IllegalAccessException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (InvocationTargetException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (SecurityException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (NoSuchMethodException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (ClassNotFoundException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} catch (NoSuchFieldException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			} finally {
				this.card = null;
			}
		}
	}
}
