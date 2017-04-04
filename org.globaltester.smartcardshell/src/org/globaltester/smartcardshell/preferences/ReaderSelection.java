package org.globaltester.smartcardshell.preferences;

import java.util.Enumeration;

import org.eclipse.core.runtime.Platform;
import org.eclipse.core.runtime.preferences.IPreferencesService;
import org.globaltester.logging.legacy.logger.TestLogger;
import org.globaltester.smartcardshell.Activator;

import opencard.core.service.CardServiceException;
import opencard.core.service.SmartCard;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalException;
import opencard.core.terminal.CardTerminalRegistry;
import opencard.core.util.OpenCardPropertyLoadingException;

/**
 * This class bundles the options for and concerning the selection of the actually used card reader.
 * 
 * @author slutters
 * 
 */
public class ReaderSelection {

	/**
	 * This method returns the name of the suggested card reader to be used.
	 * If automatic selection is selected the first available card reader with a card present will be returned.
	 * If no card reader is found to have a card present the first available card reader will be returned.
	 * Please note that there is no guarantee to the order of the list of available card readers.
	 * If there is no card reader available at all an empty String will be returned. 
	 * If manual selection is selected the manually selected card reader's name will be returned if an existing card reader is found matching the name.
	 * Otherwise automatic selection will be performed as fallback.
	 */
	public static String getSuggestedReaderName() {
		String currentReaderName = "";
		String suggestedReaderName = "";
		
		try {
			
			SmartCard.start();
			
			CardTerminalRegistry ctr = CardTerminalRegistry.getRegistry();
			Enumeration<?> ctlist = ctr.getCardTerminals();
			
			if (isManualReader()) {
				String selectedReader = getManuallySelectedReader();
				
				while (ctlist.hasMoreElements()) {
					CardTerminal ct = (CardTerminal) ctlist.nextElement();
					currentReaderName = ct.getName();
					if (currentReaderName.equals(selectedReader)) {
						suggestedReaderName = currentReaderName;
						break;
					}
				}
			}
			
			// if there is not suggested any card reader yet
			if(suggestedReaderName.length() == 0) {
				boolean firstCardReader = true;
				
				while (ctlist.hasMoreElements()) {
					CardTerminal ct = (CardTerminal) ctlist.nextElement();
					currentReaderName = ct.getName();
					
					if(firstCardReader) {
						suggestedReaderName = currentReaderName;
						firstCardReader = false;
					}
					
					try {
						if (ct.isCardPresent(0)) {
							suggestedReaderName = currentReaderName;
							break;
						}
					} catch (CardTerminalException e) {
						TestLogger.error(e);
					}
				}
			}
			
			SmartCard.shutdown();
		} catch (CardTerminalException | OpenCardPropertyLoadingException | CardServiceException | ClassNotFoundException e) {
			// just print the error
			e.printStackTrace();
		}
		
		return suggestedReaderName;
	}
	
	public static boolean isManualReader() {
		IPreferencesService scshPrefs = Platform.getPreferencesService();
		
		return scshPrefs.getBoolean(Activator.PLUGIN_ID, PreferenceConstants.OCF_MANUAL_READERSELECT, false, null);
	}
	
	public static String getManuallySelectedReader() {
		IPreferencesService scshPrefs = Platform.getPreferencesService();
		
		return scshPrefs.getString(org.globaltester.smartcardshell.Activator.PLUGIN_ID, PreferenceConstants.OCF_READER, "", null);
	}

}
