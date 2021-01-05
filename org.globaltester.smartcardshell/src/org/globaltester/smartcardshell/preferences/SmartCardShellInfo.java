package org.globaltester.smartcardshell.preferences;

import java.io.File;
import java.util.Enumeration;

import org.eclipse.core.runtime.IPath;
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
public class SmartCardShellInfo {
	
	public static String activeReaderName = "unknown";
	
	public static void startSmartcard() throws OpenCardPropertyLoadingException, CardServiceException, CardTerminalException, ClassNotFoundException {
		//if (!SmartCard.isStarted()) {
			SmartCard.start();	
		//}
	}
	
	public static void shutdownSmartcard() throws CardTerminalException {
		if (!Activator.getDefault().getPreferenceStore().getBoolean(PreferenceConstants.OCF_KEEP_RUNNING)) {
			SmartCard.shutdown();	
		}
	}

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
			
			startSmartcard();
			
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
			
			shutdownSmartcard();
		} catch (CardTerminalException | OpenCardPropertyLoadingException | CardServiceException | ClassNotFoundException e) {
			// just print the error
			e.printStackTrace();
		}
		
		return suggestedReaderName;
	}
	
	/**
	 * Checks all card readers defined in opencard properties
	 * 
	 * @return true if card reader is available, else false
	 */
	public static boolean checkCardReader() {
		TestLogger.debug("Looking up for card readers...");
		
		String[][] readerList;
		
		try {
			startSmartcard();
			CardTerminalRegistry ctr = CardTerminalRegistry.getRegistry();
			Enumeration<?> ctlist = ctr.getCardTerminals();
			int i = ctr.countCardTerminals();

			readerList = new String[i][2];

			i = 0;
			while (ctlist.hasMoreElements()) {
				CardTerminal ct = (CardTerminal) ctlist.nextElement();
				readerList[i][0] = ct.getName();
				readerList[i][1] = Integer.toString(i);
				TestLogger.debug("Registered card reader(s): " + readerList[i][0]);
				i++;
			}
			
			shutdownSmartcard();
			
			if (i == 0) {
				TestLogger.error("No card reader registered!");
				return false;
			}
			return true;
		}
		
		catch (Exception e) {
			TestLogger.error("No card reader registered!");
			TestLogger.error(e);
			return false;
		}
	}
	
	/**
	 * This method determines and sets the currently active card reader's name and returns the value.
	 * For details on the selection mechanism see {@link #getSuggestedReaderName()}.
	 * @return the value of the currently active card reader.
	 */
	public static String setActiveReaderName() {
		activeReaderName = getSuggestedReaderName();
		return activeReaderName;
	}
	
	/**
	 * This method returns the previously set active card reader's name.
	 * @return the previously set active card reader's name.
	 */
	public static String getActiveReaderName() {
		return activeReaderName;
	}
	
	public static boolean isManualReader() {
		return Activator.getDefault().getPreferenceStore().getBoolean(PreferenceConstants.OCF_MANUAL_READERSELECT);
	}
	
	public static String getManuallySelectedReader() {
		return Activator.getDefault().getPreferenceStore().getString(PreferenceConstants.OCF_READER);
	}
	
	public static int getDefaultReadBufferSize() {
		return Activator.getDefault().getPreferenceStore().getInt(PreferenceConstants.P_READBUFFER);
	}
	
	public static String getBufferSizeForFunctionReadFileEOF() {
		return Activator.getDefault().getPreferenceStore().getString(PreferenceConstants.P_BUFFERREADFILEEOF);
	}
	
	public static boolean allowEmptyReader() {
		return Activator.getDefault().getPreferenceStore().getBoolean(PreferenceConstants.P_ALLOW_EMPTY_READER);
	}
	
	public static String getConfigFile() {
		return Activator.getPluginDir().toOSString() + Activator.SCSH_FOLDER + File.separator + "config.js";
	}
	
	public static IPath getPluginDir() {
		return Activator.getPluginDir();
	}

}
