package org.globaltester.smartcardshell.ui;

import java.io.File;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IPath;
import org.eclipse.debug.internal.core.LaunchManager;
import org.eclipse.debug.core.ILaunchConfiguration;
import org.eclipse.debug.core.ILaunchManager;
import org.eclipse.debug.internal.core.LaunchConfiguration;
import org.eclipse.debug.ui.DebugUITools;
import org.eclipse.swt.widgets.Display;
import org.globaltester.logging.logger.GtErrorLogger;
import org.globaltester.logging.logger.JSDebugLogger;
import org.globaltester.smartcardshell.Activator;
import org.globaltester.smartcardshell.RhinoJavaScriptAccess;


/**
 * For Rhino JavaScript debugging two threads are needed. One is the debugger
 * thread, one the debugger launch thread. These two threads communicate with
 * one another using a socket. RhinoDebugLaunchManager provides functionality
 * for reading a launch configuration from the file system, setting the port
 * number for the socket communication and starting the debugger launch thread.
 * The realization of the thread communication is currently done in
 * {@link org.globaltester.testrunner.ui.commands.DebugTestCommandHandler}.
 * See also {@link org.globaltester.smartcardshell.RhinoJavaScriptAccess} for
 * details on the debugger thread.<br>
 * 
 * Usage: Call {@link #readDebugLaunchConfiguration()} to read the launch
 * configuration from the file system. Then communicate this port number using
 * {@link RhinoJavaScriptAccess#setStandardPortNum(String)}. The launch can then
 * be started using {@link #startDebugLaunchConfiguration()}. Thread
 * synchronisation must implemented for these two processes analogous to
 * ->DebugTestCommandHandler (see above).
 * 
 * @author koelzer
 *
 */
public class RhinoDebugLaunchManager extends LaunchManager {
	
	/**
	 * Name for the standard launch configuration file, stored on the file
	 * system under the default Eclipse launch configuraton path. Programmers
	 * can decide to use a different name and change this value (see
	 * {@link #setStandardLaunchConfigFileName(String)}).
	 */
	protected static String standardLaunchConfigFileName = "runJSDebugger";
	
	/**
	 * Attribute name for the key under which the port number ({@link #portNo})
	 * is stored in the {@link #standardLaunchConfigFileName}.
	 */
	protected final static String PORT_KEY = "port";
	
	/**
	 * This stores the configuration information read from
	 * {@link #standardLaunchConfigFileName}. Since the configuration may be
	 * changed by the user at runtime, this can be different for different
	 * instances.
	 */
	protected LaunchConfiguration launchConfig = null;

	/**
	 * Port number for the socket communication of the Rhino debugger thread and
	 * its debug launch thread. This value for this is currently set from the
	 * launch configuration file given by {@link #standardLaunchConfigFileName}.
	 */
	protected String portNo = "9000";

	/**
	 * Constructor for Rhino debug launch management which only calls
	 * the constructor of its super class.
	 * @see LaunchManager
	 */
	public RhinoDebugLaunchManager() {
		super();
	}
	
	/**
	 * @return the {@link #standardLaunchConfigFileName}
	 */
	public static String getStandardLaunchConfigFileName() {
		return standardLaunchConfigFileName;
	}

	/**
	 * sets {@link #standardLaunchConfigFileName}
	 * @param standardLaunchConfigFileName - new value
	 */
	public static void setStandardLaunchConfigFileName(String newStandardLaunchConfigFileName) {
		standardLaunchConfigFileName = newStandardLaunchConfigFileName;
	}

	/**
	 * Checks the given configuration {@link #launchConfig} for the attribute
	 * {@link #PORT_KEY} and sets {@link #portNo} with its value. If this is not
	 * successful, the value will stay unchanged (it is initially set to a
	 * default value).
	 */
	protected void setPortNumFromConfig() {
		if (launchConfig == null) {
			String error = "Variable launchConfig for launch configuration is unset in class " + 
							getClass().getCanonicalName() + "!\n" +  
						   "Debug configuration settings cannot be read from it!\n";
			JSDebugLogger.error(error);
			return;
		}
		
		try {
			Map<String, String> argumentMap = new HashMap<String, String> ();
			Map<String, String> defaultMap = new HashMap<String, String> ();
			defaultMap.put("", "");
			argumentMap = launchConfig.getAttribute("argument_map", defaultMap);
			if (argumentMap.equals(defaultMap)) {
				JSDebugLogger.error("No argument map found for Rhino debug configuration settings!\n");
				JSDebugLogger.error("Port number could not be extracted!\n");	
			}			
			else if (argumentMap.containsKey(PORT_KEY)) {
				portNo = argumentMap.get(PORT_KEY);
				JSDebugLogger.info("Port number is " + portNo + "!\n");
			}	
			else {
				JSDebugLogger.error("Port number could not be extracted from Rhino debug configuration settings!\n");
				JSDebugLogger.error("Key \"" + PORT_KEY + "\" was not found!\n");
			}
		} catch (CoreException exc) {
			String error = "No valid argument map found for Rhino debug " +
						  "configuration settings! Port number stays set to default value.\n";  
			JSDebugLogger.error(error);
			//exc.printStackTrace();
			Exception newExc = new Exception(error, exc);
			GtErrorLogger.log(Activator.PLUGIN_ID, newExc);

		}
		
		// If the port number could not be set properly, we try to communicate using
		// the default value.
		// NOTE: we could also throw an exception in that case
		String info = "Port number for thread communication between Rhino " +
					  "JavaScript debugger and its launch configuration is set to " + 
					  portNo + "!\n";
		JSDebugLogger.info(info);;
	}

	/**
	 * Checks the standard Eclipse debug launch configuration path in order to
	 * find the standard Rhino configuration named
	 * {@link #standardLaunchConfigFileName}
	 * 
	 * @return the found configuration, null if nothing found.
	 */
	protected ILaunchConfiguration findLocalStandardLaunchConfiguration() {
		
		// retrieve launch configurations from file system and check if our 
		// standard config exists there
		List<ILaunchConfiguration> validConfigs = new ArrayList<ILaunchConfiguration>(20);
		List<ILaunchConfiguration> configs = findLocalLaunchConfigurations();
		verifyConfigurations(configs, validConfigs);

		for (ILaunchConfiguration curConfig:validConfigs) {
			if (curConfig.getName().equals(getStandardLaunchConfigFileName())) {
				return curConfig;
			}
		}
		return null;
	}
	
	/**
	 * @return {@link #portNo}
	 */
	public String getPortNo() {
		return portNo;
	}

	/**
	 * Reads the configuration settings from the file system using
	 * {@link #findLocalStandardLaunchConfiguration()}.
	 * 
	 * @throws Exception if no configuration file could be found
	 */
	public void readDebugLaunchConfiguration() throws Exception {

		// path information code was copied from LaunchManager:findLocalLaunchConfigurations()
		IPath containerPath = RhinoDebugLaunchManager.LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH;
		if (containerPath == null) {
			// no path set
			Exception exc = new Exception("No path found for JavaScript debug launch. " + 
					"LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH in class LaunchManager must be set correctly!");
			//NOTE: we could use a builtin launch configuration instead!
			throw exc;
			
		}

		final File directory = containerPath.toFile();
		if (directory == null) {
			Exception exc = new Exception("Error in retrieving file for path " + containerPath.toOSString() + "!");
			throw exc;			
		}

		ILaunchConfiguration stdConfig = findLocalStandardLaunchConfiguration();
		if (stdConfig == null) {
			// no configuration found
			Exception exc = new Exception("Standard launch configuration file " + 
							standardLaunchConfigFileName + " " +
							"for Rhino debugger missing or invalid!\n" +
							"File was looked for in directory " +
							containerPath.toOSString());
			// TODO amay: call GTErrorLogger where exception is thrown or caught?
			throw exc;
		}
		
		if (stdConfig instanceof LaunchConfiguration) {
			launchConfig = (LaunchConfiguration) stdConfig;
			setPortNumFromConfig();

			//print logging
			// TODO uncomment this! 
			// Map<String, Object> attrs = launchConfig.getAttributes();
			// String info = "Rhino debug configuration settings:" + attrs + "\n";
			// JSDebugLogger.info(info);
		}
		else {
			String error =  "Something wrong with Rhino debug configuration: wrong type - check this!\n" +
							"Trying to connect debugger to port " + getPortNo() + "!\n" +
							"Will try to continue execution nevertheless!\n";
			JSDebugLogger.error(error);
		}
	}		
	
	/**
	 * Starts a new Rhino debug launch using the standard configuration settings
	 * given by {@link #launchConfig}.
	 * 
	 * @throws Exception
	 *             if the standard configuration was not properly set before
	 *             this call.
	 */
	public void startDebugLaunchConfiguration() throws Exception {
		if (launchConfig == null) {
			// no configuration found
			String error = "Standard configuration was not correctly initialized!\n" +
					  "Make sure the launch configuration file " + standardLaunchConfigFileName +
					  " exists on the standard launch configuration path.\n";
			Exception exc = new Exception(error);
			JSDebugLogger.error(error);
			throw exc;			
		}
		
		// TODO this can be deleted as soon as we are sure there are no more thread problems
		if (Display.findDisplay(Thread.currentThread()) == null) {
			System.out.println("Thread is not UI in RhinoDebugLaunchManager.startDebugLaunchConfiguration");
		} else {
			System.out.println("Thread is UI in RhinoDebugLaunchManager.startDebugLaunchConfiguration");
		}
		
		// start launch
		DebugUITools.launch(launchConfig, ILaunchManager.DEBUG_MODE);
	}
}
