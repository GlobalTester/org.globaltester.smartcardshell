package org.globaltester.smartcardshell.preferences;

import java.io.File;

import org.eclipse.core.runtime.IPath;
import org.eclipse.core.runtime.preferences.AbstractPreferenceInitializer;
import org.eclipse.core.runtime.preferences.DefaultScope;
import org.globaltester.smartcardshell.Activator;
import org.osgi.service.prefs.BackingStoreException;
import org.osgi.service.prefs.Preferences;

/**
 * This class initializes preference store with default values
 * 
 * @author amay
 * 
 */
public class PreferenceInitializer extends AbstractPreferenceInitializer {

	@Override
	public void initializeDefaultPreferences() {

		Preferences preferences = new DefaultScope()
				.getNode(Activator.PLUGIN_ID);

		preferences.put(PreferenceConstants.OCF_CONFIGURATION_SOURCE,
				PreferenceConstants.OCF_CONFIGURATION_SOURCE_preferences);

		IPath pluginDir = Activator.getPluginDir();
		String configPath = pluginDir.toPortableString()
				+ Activator.SCSH_FOLDER + File.separator
				+ "opencard.properties";
		preferences.put(PreferenceConstants.OCF_PROPERTIES_FILE, configPath);

		preferences.put(PreferenceConstants.OCF_OPENCARD_SERVICES,
				"de.cardcontact.opencard.factory.IsoCardServiceFactory "
						+ "opencard.opt.util.PassThruCardServiceFactory");
		preferences
				.put(PreferenceConstants.OCF_OPENCARD_TERMINALS,
						"de.cardcontact.opencard.terminal.smartcardio.SmartCardIOFactory|*|PCSC10-NOPOLL " +
						"org.globaltester.smartcardshell.ocf.terminal.SocketCardTerminalFactory|SocketCardTerminal|Socket|9876|localhost");

		preferences.put(PreferenceConstants.OCF_READER, "");
		preferences.putBoolean(PreferenceConstants.OCF_MANUAL_READERSELECT,
				false);

		try {
			// Forces the application to save the preferences
			preferences.flush();
		} catch (BackingStoreException e) {
			e.printStackTrace();
		}

	}

}