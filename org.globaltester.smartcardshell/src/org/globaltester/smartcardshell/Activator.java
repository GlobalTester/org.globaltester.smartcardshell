package org.globaltester.smartcardshell;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URL;
import java.nio.channels.FileChannel;

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
		
		checkEnvironment();
		
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
	 * Lookup for property file 'opencard.properties'
	 * 
	 */
	private void checkEnvironment() {
		//log.debug("Looking up for property file opencard.properties...");

		IPath pluginDir = getPluginDir();

		File propertyFile = new File(System.getProperty("user.dir")
				+ File.separator +"opencard.properties");
		if (propertyFile.exists()) {
			//log.debug("Property file opencard.properties exists");
		} else {
			//log.debug("Creating new property file opencard.properties");
			File internalPropertyFile = new File(pluginDir
					+ File.separator + "opencard.properties");
			copy(internalPropertyFile, propertyFile);
			//log.debug("Property file " + propertyFile +" created.");
		}
	}
	
	/**
	 * Overwrites destination file with source file
	 * 
	 * @param sourceFile
	 * @param destinationFile
	 */
	private void copy(File sourceFile, File destinationFile) {
		try {
			FileChannel in = new FileInputStream(sourceFile).getChannel();
			FileChannel out = new FileOutputStream(destinationFile)
					.getChannel();
			try {
				in.transferTo(0, in.size(), out);
				in.close();
				out.close();
			} catch (IOException e) {
				//log.error(e);
			} finally {
				
			}
		} catch (FileNotFoundException e) {
			//log.error(e);
		}
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
