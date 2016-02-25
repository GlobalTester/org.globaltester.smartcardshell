package org.globaltester.smartcardshell;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.IPath;
import org.eclipse.core.runtime.Path;
import org.eclipse.ui.plugin.AbstractUIPlugin;
import org.globaltester.smartcardshell.ocf.OCFWrapper;
import org.osgi.framework.BundleContext;

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

	/*
	 * (non-Javadoc)
	 * @see org.osgi.framework.BundleActivator#start(org.osgi.framework.BundleContext)
	 */
	public void start(BundleContext bundleContext) throws Exception {
		super.start(bundleContext);
		Activator.setContext(bundleContext);
		plugin = this;
		
		File cardProperties = getOpenCardProperties();
		if (!cardProperties.exists()){
			createOpenCardProperties(cardProperties);	
		}
		
		//set up the OpenCardFramework
		OCFWrapper.start();
	}

	/*
	 * (non-Javadoc)
	 * @see org.osgi.framework.BundleActivator#stop(org.osgi.framework.BundleContext)
	 */
	public void stop(BundleContext bundleContext) throws Exception {
		plugin = null;
		Activator.setContext(null);
		OCFWrapper.shutdown();
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
