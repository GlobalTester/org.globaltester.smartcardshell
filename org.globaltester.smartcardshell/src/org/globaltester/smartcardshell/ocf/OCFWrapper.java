package org.globaltester.smartcardshell.ocf;


import opencard.core.service.CardServiceException;
import opencard.core.service.SmartCard;
import opencard.core.terminal.CardTerminalException;
import opencard.core.util.OpenCardPropertyLoadingException;

public class OCFWrapper {

	public static void restart() throws CardTerminalException, OpenCardPropertyLoadingException, CardServiceException, ClassNotFoundException {
		if (SmartCard.isStarted()) {
			SmartCard.shutdown();
		}
		SmartCard.start();
		//IMPL implement extension point to notify users of OCF about the upcoming restart
	}

	public static void shutdown() throws CardTerminalException {
		SmartCard.shutdown();
	}

	public static void start() throws OpenCardPropertyLoadingException, CardServiceException, CardTerminalException, ClassNotFoundException {
		if(!SmartCard.isStarted()){
			PreferencesPropertyLoader.initOCF();
			SmartCard.start();
		}
	}

}
