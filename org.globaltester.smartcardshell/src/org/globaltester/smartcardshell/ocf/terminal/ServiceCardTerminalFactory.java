/*
 * Project OCFSocketTerminal Package com.hjp.opencard.terminal.socketterminal
 * 
 * 
 * 
 * $Date: 2009/02/13 11:27:20 $ $Revision: 1.1 $ $Id:
 * SocketCardTerminalFactory.java,v 1.1 2009/02/13 11:27:20 hfunke Exp $
 * 
 * Copyright (c) 2006 HJP Consulting GmbH Lanfert 24 33106 Paderborn Germany All
 * rights reserved.
 * 
 * This software is the confidential and proprietary information of HJP
 * ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the
 * Non-Disclosure Agreement you entered into with HJP.
 */

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
		ctr.add(new ServiceCardTerminal("Service Card Terminal", "HJP OSGi Simulator", "0"));
	}

	/*
	 * (non-Javadoc)
	 * 
	 * @see opencard.core.terminal.CardTerminalFactory#open()
	 */
	public void open() throws CardTerminalException {
	}

}
