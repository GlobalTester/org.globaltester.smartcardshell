package org.globaltester.smartcardshell;

import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.Properties;

import opencard.core.service.CardServiceException;
import opencard.core.service.SmartCard;
import opencard.core.terminal.CardTerminalException;
import opencard.core.util.OpenCardConfigurationProvider;
import opencard.core.util.OpenCardPropertyLoadingException;

import org.eclipse.core.runtime.Platform;
import org.eclipse.core.runtime.preferences.IPreferencesService;
import org.globaltester.smartcardshell.preferences.PreferenceConstants;

public class PreferencesPropertyLoader implements OpenCardConfigurationProvider {

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
			System.setProperty("OpenCard.loaderClassName",
					PreferencesPropertyLoader.class.getCanonicalName());
		}

		else {
			// use default implementation that loads properties from property
			// file
			System.setProperty("OpenCard.loaderClassName",
					"opencard.opt.util.OpenCardPropertyFileLoader");
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
	public static void restartAndInitializeOCF() throws CardTerminalException,
			OpenCardPropertyLoadingException, CardServiceException,
			ClassNotFoundException {

		SmartCard.shutdown();

		String configSource = Platform.getPreferencesService().getString(
				Activator.PLUGIN_ID,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE, "", null);

		if ((configSource
				.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_file))
				|| (configSource
						.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences))) {
			// use this PropertyLoader that sets properties according to eclipse
			// preferences
			System.setProperty("OpenCard.loaderClassName",
					PreferencesPropertyLoader.class.getCanonicalName());
		}

		else {
			// use default implementation that loads properties from property
			// file
			System.setProperty("OpenCard.loaderClassName",
					"opencard.opt.util.OpenCardPropertyFileLoader");
		}

		SmartCard.start();
	}

	@Override
	public void loadProperties() throws OpenCardPropertyLoadingException {
		String configSource = Platform.getPreferencesService().getString(
				Activator.PLUGIN_ID,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE, "", null);

		if (configSource
				.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_file)) {
			this.loadPropertiesFromFile();
		} else if (configSource
				.equals(PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences)) {
			this.loadPropertiesFromPreferences();
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
	private void loadPropertiesFromFile()
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
		Properties props = new Properties();
		FileInputStream inputStream = null;
		try {
			inputStream = new FileInputStream(fileName);
			props.load(inputStream);
		} catch (FileNotFoundException e) {
			loadingImpossible("Properties file can not be found: "
					+ e.getMessage());
		} catch (IOException e) {
			loadingImpossible("Properties file can not used: " + e.getMessage());
		} finally {
			if (inputStream != null) {
				try {
					inputStream.close();
				} catch (IOException e) {
					// ignore this, if the stream can not be closed it does not
					// need to be closed
				}
			}
		}
		System.setProperties(props);

	}

	private void loadPropertiesFromPreferences()
			throws OpenCardPropertyLoadingException {

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

	private void loadingImpossible(String msg)
			throws OpenCardPropertyLoadingException {
		System.setProperty("OpenCard.loaderClassName",
				"opencard.opt.util.OpenCardPropertyFileLoader");
		throw new OpenCardPropertyLoadingException(msg);

	}
}
