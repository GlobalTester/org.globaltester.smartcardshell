package org.globaltester.smartcardshell;

import java.io.IOException;
import java.net.URL;

import opencard.core.service.SmartCard;

import org.eclipse.core.runtime.FileLocator;
import org.eclipse.core.runtime.IPath;
import org.eclipse.core.runtime.Path;
import org.osgi.framework.BundleActivator;
import org.osgi.framework.BundleContext;

public class Activator implements BundleActivator {

	public static final String PLUGIN_ID = "org.globaltester.smartcardshell";

	public static final String SCSH_FOLDER = "scsh3.7.989";
	
	private static BundleContext context;

	static BundleContext getContext() {
		return context;
	}

	/*
	 * (non-Javadoc)
	 * @see org.osgi.framework.BundleActivator#start(org.osgi.framework.BundleContext)
	 */
	public void start(BundleContext bundleContext) throws Exception {
		Activator.context = bundleContext;
		
		//set up the OpenCardFramework
		PreferencesPropertyLoader.initOCF();
		SmartCard.start();
	}

	/*
	 * (non-Javadoc)
	 * @see org.osgi.framework.BundleActivator#stop(org.osgi.framework.BundleContext)
	 */
	public void stop(BundleContext bundleContext) throws Exception {
		Activator.context = null;
		SmartCard.shutdown();
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

}
