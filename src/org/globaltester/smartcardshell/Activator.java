package org.globaltester.smartcardshell;

import opencard.core.service.SmartCard;

import org.osgi.framework.BundleActivator;
import org.osgi.framework.BundleContext;

public class Activator implements BundleActivator {

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
		Activator.initOCF();
		SmartCard.start();
	}

	/**
	 * initalize the OpenCardFramework with required values form preferences
	 */
	private static void initOCF() {
		//FIXME AMY remove this dependency to TestCode and apply real preference values here
		System.setProperty("OpenCard.loaderClassName",
				"org.globaltester.smartcardshell.test.TestPropertyLoader");
		
	}

	/*
	 * (non-Javadoc)
	 * @see org.osgi.framework.BundleActivator#stop(org.osgi.framework.BundleContext)
	 */
	public void stop(BundleContext bundleContext) throws Exception {
		Activator.context = null;
		SmartCard.shutdown();
	}

}
