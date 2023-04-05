package org.globaltester.smartcardshell;

import org.globaltester.smartcardshell.ocf.terminal.TFWSocketCardTerminal;
import org.junit.Ignore;
import org.junit.Test;

import de.cardcontact.tlv.HexString;

/**
 * 
 * @author mbo
 * 
 */
public class TfwTerminalTest {

	@Ignore
	@Test
	public void terminalsAvailable() throws Exception {
		
		TFWSocketCardTerminal t = new TFWSocketCardTerminal("TFW", "Socket", "42135", "10.154.254.103");
		
		if (t.isCardPresent(0)) {
			t.open();
			t.connectToCard(0);
			t.sendMessage(0, 2, HexString.parseHexString("810102"));
			t.sendMessage(0, 2, HexString.parseHexString("810101820111830100"));
			t.sendMessage(0, 2, HexString.parseHexString("810108820111830100"));
			t.close();
		}
	}

}
