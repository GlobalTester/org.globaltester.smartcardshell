package org.globaltester.smartcardshell.preferences;

/**
 * This class defines constants to reference preference values
 * 
 * @author amay
 * 
 */
public class PreferenceConstants {

	// Preferences to define OCF configuration source
	public static final String OCF_CONFIGURATION_SOURCE = "org.globaltester.smartcardshell.ocf.configuration.source";
	public static final String OCF_CONFIGURATION_SOURCE_default = "default"; // configure
																				// OCF
																				// from
																				// default
																				// opencard.properties
																				// file(s)
	public static final String OCF_CONFIGURATION_SOURCE_file = "file"; // configure
																		// OCF
																		// from
																		// user
																		// specified
																		// opencard.properties
																		// file
	public static final String OCF_CONFIGURATION_SOURCE_preferences = "preferences"; // configure
																						// OCF
																						// from
																						// preferences

	// path to opencard.properties file if it should be used
	public static final String OCF_PROPERTIES_FILE = "org.globaltester.smartcardshell.ocf.properties.file";

	// opencard properties
	public static final String OCF_OPENCARD_SERVICES = "org.globaltester.smartcardshell.ocf.opencard.services";
	public static final String OCF_OPENCARD_TERMINALS = "org.globaltester.smartcardshell.ocf.opencard.terminals";
	
	// reader selection properties
	public static final String OCF_READER = "org.globaltester.smartcardshell.ocf.reader";
	public static final String OCF_MANUAL_READERSELECT = "org.globaltester.smartcardshell.ocf.reader.manualselect";
	public static final String P_ALLOW_EMPTY_READER = "GlobalTester_TestManager_allow_empty_reader";

	//readerBuffer and ReadFileEOF setting
	public static final String P_READBUFFER = "Default read buffer size";
	public static final String P_BUFFERREADFILEEOF = "Buffer size for function readFileEOF";

}
