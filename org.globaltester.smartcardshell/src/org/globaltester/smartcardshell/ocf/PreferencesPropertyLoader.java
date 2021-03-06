package org.globaltester.smartcardshell.ocf;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

import org.eclipse.core.runtime.Platform;
import org.eclipse.core.runtime.preferences.IPreferencesService;
import org.globaltester.logging.legacy.logger.GtErrorLogger;
import org.globaltester.smartcardshell.Activator;
import org.globaltester.smartcardshell.preferences.PreferenceConstants;

import opencard.core.service.CardServiceException;
import opencard.core.terminal.CardTerminalException;
import opencard.core.util.OpenCardConfigurationProvider;
import opencard.core.util.OpenCardPropertyLoadingException;

public class PreferencesPropertyLoader implements OpenCardConfigurationProvider {

	private static final String OPENCARD_OPT_UTIL_OPEN_CARD_PROPERTY_FILE_LOADER = "opencard.opt.util.OpenCardPropertyFileLoader";
	private static final String OPEN_CARD_LOADER_CLASS_NAME = "OpenCard.loaderClassName";

	/**
	 * initialize the OpenCardFramework to use values from plugin preferences
	 */
	public static void initOCF() {

		String configSource = Platform.getPreferencesService().getString(
				Activator.PLUGIN_ID,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE, "", null);

		if ((configSource
				.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_file))
				|| (configSource
						.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences))) {
			// use this PropertyLoader that sets properties according to eclipse
			// preferences
			System.setProperty(OPEN_CARD_LOADER_CLASS_NAME,
					PreferencesPropertyLoader.class.getCanonicalName());
		}

		else {
			// use default implementation that loads properties from property
			// file
			System.setProperty(OPEN_CARD_LOADER_CLASS_NAME,
					OPENCARD_OPT_UTIL_OPEN_CARD_PROPERTY_FILE_LOADER);
		}
	}

	/**
	 * re-initialize the OpenCardFramework to use values from plugin preferences
	 * 
	 * @throws CardTerminalException
	 * @throws ClassNotFoundException
	 * @throws CardServiceException
	 * @throws OpenCardPropertyLoadingException
	 */
	public static void restartAndInitializeOCF() {

		String configSource = Platform.getPreferencesService().getString(
				Activator.PLUGIN_ID,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE, "", null);

		if ((configSource
				.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_file))
				|| (configSource
						.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences))) {
			// use this PropertyLoader that sets properties according to eclipse
			// preferences
			System.setProperty(OPEN_CARD_LOADER_CLASS_NAME,
					PreferencesPropertyLoader.class.getCanonicalName());
		}

		else {
			// use default implementation that loads properties from property
			// file
			System.setProperty(OPEN_CARD_LOADER_CLASS_NAME,
					OPENCARD_OPT_UTIL_OPEN_CARD_PROPERTY_FILE_LOADER);
		}

	}

	@Override
	public void loadProperties() throws OpenCardPropertyLoadingException {
		String configSource = Platform.getPreferencesService().getString(
				Activator.PLUGIN_ID,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE, "", null);

		if (configSource
				.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_file)) {
			loadPropertiesFromFile();
		} else if (configSource
				.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences)) {
			loadPropertiesFromPreferences();
		} else {
			loadingImpossible("Preferences do not allow loading of properties from preferences");
		}
	}

	/**
	 * Load properties from a properties file, location of file to use is given
	 * in preferences
	 * 
	 * @throws OpenCardPropertyLoadingException
	 */
	private static void loadPropertiesFromFile()
			throws OpenCardPropertyLoadingException {
		IPreferencesService prefService = Platform.getPreferencesService();

		// check that loading from file is allowed
		String configSource = prefService.getString(Activator.PLUGIN_ID,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE, "", null);
		if (!configSource
				.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_file)) {
			loadingImpossible("Preferences do not allow loading of properties from file");
		}

		// get fileName from preferences
		String fileName = prefService.getString(Activator.PLUGIN_ID,
				PreferenceConstants.OCF_PROPERTIES_FILE, "", null);

		// set properties from file contents
		Properties props = new Properties(System.getProperties());
		try (FileInputStream inputStream = new FileInputStream(fileName)) {
			props.load(inputStream);
		} catch (IOException e) {
			GtErrorLogger.log(Activator.PLUGIN_ID, e);
			loadingImpossible("Properties file can not used: " + e.getMessage());
		}
		System.setProperties(props);

	}

	private static void loadPropertiesFromPreferences() {

		IPreferencesService prefService = Platform.getPreferencesService();

		// get values from preferences
		String services = prefService.getString(Activator.PLUGIN_ID,
				PreferenceConstants.OCF_OPENCARD_SERVICES, "", null);
		String terminals = prefService.getString(Activator.PLUGIN_ID,
				PreferenceConstants.OCF_OPENCARD_TERMINALS, "", null);

		// set values from preferences to properties
		System.setProperty("OpenCard.services", services);
		System.setProperty("OpenCard.terminals", terminals);

	}

	private static void loadingImpossible(String msg)
			throws OpenCardPropertyLoadingException {
		System.setProperty(OPEN_CARD_LOADER_CLASS_NAME,
				OPENCARD_OPT_UTIL_OPEN_CARD_PROPERTY_FILE_LOADER);
		throw new OpenCardPropertyLoadingException(msg);

	}
}
