package org.globaltester.smartcardshell.ocf.terminal;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.UnknownHostException;

import org.bouncycastle.asn1.ASN1InputStream;
import org.bouncycastle.asn1.ASN1OutputStream;
import org.bouncycastle.asn1.DERApplicationSpecific;

import de.cardcontact.tlv.HexString;
import opencard.core.terminal.CardID;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CommandAPDU;

public class TFWSocketCardTerminal extends SocketCardTerminal {
	private byte[] cachedATR;
	private PrintWriter log;
	private int port;
	private String host;
	private Socket socket;
	
	protected TFWSocketCardTerminal(String name, String type, String device, String hostname) {
		super(name, type, device, hostname);
	}
	
	@Override
	protected byte[] exchange(int slotID, CommandAPDU apdu) throws CardTerminalException {
		if (slotID != 0) {
			throw new CardTerminalException("Unknown slot");
		}
		if (socket == null) {
			throw new CardTerminalException("Not connected");
		}
		
		ASN1OutputStream out;
		ASN1InputStream in;
		Object asn1Response;
		try {
			out = new ASN1OutputStream(new BufferedOutputStream(socket.getOutputStream()));
			in = new ASN1InputStream(new BufferedInputStream(socket.getInputStream()));
			 
			out.writeObject(new DERApplicationSpecific(0x0, apdu.getBytes()));
			out.flush();
			 
			asn1Response = in.readObject();	 
		} catch (IOException e) {
			e.printStackTrace(log);
			log.flush();
			throw new CardTerminalException("Could not open connection or connection reset");
		}
		
		// TODO: Close socket on FF000000?
		
		if (!(asn1Response instanceof DERApplicationSpecific)) {
			throw new CardTerminalException("Illegal state: Response is not of type DERApplicationSpecific");
		}
		
		return ((DERApplicationSpecific) asn1Response).getContents();
	}
	
}
