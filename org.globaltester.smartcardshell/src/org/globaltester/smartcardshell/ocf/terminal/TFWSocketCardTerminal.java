package org.globaltester.smartcardshell.ocf.terminal;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.SocketException;

import org.bouncycastle.asn1.ASN1InputStream;
import org.bouncycastle.asn1.ASN1Object;
import org.bouncycastle.asn1.ASN1OutputStream;
import org.bouncycastle.asn1.DERApplicationSpecific;
import org.bouncycastle.asn1.DERObject;

import de.persosim.simulator.tlv.PrimitiveTlvDataObject;
import de.persosim.simulator.tlv.TlvTag;
import opencard.core.terminal.CardID;
import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CommandAPDU;

public class TFWSocketCardTerminal extends SocketCardTerminal {
	
	protected TFWSocketCardTerminal(String name, String type, String device, String hostname) {
		super(name, type, device, hostname);
	}
	
	@Override
	protected byte[] exchange(int slotID, CommandAPDU apdu) throws CardTerminalException {
		log.append("\n\nTest\n\n");
		log.flush();
		if (slotID != 0) {
			throw new CardTerminalException("Unknown slot");
		}
		if (socket == null) {
			throw new CardTerminalException("Not connected");
		}
		
		ASN1OutputStream out;
		ASN1InputStream in;
		DERObject derResponse;
		try {
			out = new ASN1OutputStream(socket.getOutputStream());
			in = new ASN1InputStream(socket.getInputStream());
			 
			out.writeObject(new DERApplicationSpecific(0, apdu.getBytes()));
			out.flush();
			 
			derResponse = in.readObject();	 
		} catch (IOException e) {
			e.printStackTrace(log);
			log.flush();
			throw new CardTerminalException("Could not open connection or connection reset");
		}
		
		// TODO: Close socket on FF000000?
		
		if (!(derResponse instanceof DERApplicationSpecific)) {
			throw new CardTerminalException("Illegal state: Response is not of type DERApplicationSpecific");
		}
		
		return ((DERApplicationSpecific) derResponse).getContents();
	}
	
	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#isCardPresent(int)
	 */
	@Override
	public boolean isCardPresent(int slotID) throws CardTerminalException {
		if (socket == null || socket.isClosed()) {
			return openSocket();
		}
		return true;
	}
	
	/**
	 * @param slotID
	 * @return
	 * @throws CardTerminalException
	 * @throws SocketException 
	 */
	@Override
	protected byte[] connectToCard(int slotID) throws CardTerminalException, SocketException {
		final byte[] atr = new byte[] {0x3b, (byte)0x90, (byte)0x94, 0x00, (byte)0x92, 0x02, 0x75, (byte)0x93, 0x11, 0x00, 0x01, 0x02, 0x02, 0x10};
		
		if (socket != null && socket.isConnected()) {
			return atr;
		}
		
		if (openSocket()){
			return atr;
		} else {
			return null;
		}
	}
	
	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminal#close()
	 */
	@Override
	public void close() throws CardTerminalException {
		closeSocket();
		log.close();
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

}
