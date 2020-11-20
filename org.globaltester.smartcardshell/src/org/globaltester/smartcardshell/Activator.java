package org.globaltester.smartcardshell;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Hashtable;

import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.IPath;
import org.eclipse.core.runtime.Path;
import org.eclipse.ui.plugin.AbstractUIPlugin;
import org.globaltester.control.RemoteControlHandler;
import org.globaltester.smartcardshell.ocf.PreferencesPropertyLoader;
import org.osgi.framework.BundleContext;
import org.osgi.framework.ServiceRegistration;

public class Activator extends AbstractUIPlugin {

	public static final String PLUGIN_ID = "org.globaltester.smartcardshell";
	
	// The shared instance
	private static Activator plugin;

	public static final String SCSH_FOLDER = "scsh3.7.989";
	
	private static BundleContext context;

	static BundleContext getContext() {
		return context;
	}
	
	private static void setContext(BundleContext bundleContext) {
		context = bundleContext;
	}

	private SmartCardShellManagerSoap smartCardShellManager;

	private ServiceRegistration<RemoteControlHandler> smartCardShellManagerRegistration;

	@Override
	public void start(BundleContext bundleContext) throws Exception {
		super.start(bundleContext);
		Activator.setContext(bundleContext);
		plugin = this;
		
		File cardProperties = getOpenCardProperties();
		if (!cardProperties.exists()){
			createOpenCardProperties(cardProperties);	
		}
		
		smartCardShellManager = new SmartCardShellManagerSoap();
		smartCardShellManagerRegistration = context.registerService(RemoteControlHandler.class, smartCardShellManager, new Hashtable<String, String>());
		
	
		PreferencesPropertyLoader.initOCF();
	}

	@Override
	public void stop(BundleContext bundleContext) throws Exception {
		plugin = null;
		if (smartCardShellManagerRegistration != null){
			smartCardShellManagerRegistration.unregister();	
		}
		Activator.setContext(null);
		super.stop(bundleContext);
	}
	
	/**
	 * @return the default destination for card properties file
	 */
	private File getOpenCardProperties(){
		File propertyFile = new File(System.getProperty("user.dir")
				+ File.separator +"opencard.properties");
		return propertyFile;
	}
	
	/**
	 * Copies the default opencard.properties to the given destination
	 * 
	 * @param destination
	 *            the target to copy the internal opencard.properties file to
	 * @throws IOException
	 */
	private void createOpenCardProperties(File destination) throws IOException{
		IPath pluginDir = getPluginDir();
		File internalPropertyFile = new File(pluginDir
				+ File.separator + "opencard.properties");
		Files.copy(internalPropertyFile.toPath(), destination.toPath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.COPY_ATTRIBUTES);
	}
	
	/**
	 * Returns the current path of the plugin
	 */
	public static IPath getPluginDir() {
		URL url = context.getBundle().getEntry("/");
		IPath pluginDir = null;
		try {
			pluginDir = new Path(FileLocator.toFileURL(url).getPath());
			return pluginDir;
		} catch (IOException e) {
			e.printStackTrace();
			return null;
		}
	}

	public static Activator getDefault() {
		return plugin;
	}

}
