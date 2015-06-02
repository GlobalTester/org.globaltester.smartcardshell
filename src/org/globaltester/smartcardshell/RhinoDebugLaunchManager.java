package org.globaltester.smartcardshell;

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


/**
 * This class implements an interface to the Rhino JavaScript debugger. The
 * Rhino debugger can be started. A Rhino debug launch configuration can be
 * started automatically. Debug configuration settings for this can be read from
 * file.
 * 
 * @author koelzer
 *
 */
public class RhinoDebugLaunchManager extends LaunchManager {

	/**
	 * Name for the standard launch configuration file, stored on the file system under the default Eclipse
	 * launch configuraton path.
	 */
	protected String standardLaunchConfigFileName = "runJSDebugger";
	
	/**
	 * This stores the configuration information read from {@link #standardLaunchConfigFileName}
	 */
	protected LaunchConfiguration stdLConfig = null;

	/**
	 * Port number for the socket communication of the Rhino debugger thread and its debug launch thread. 
	 */
	protected String portNo = "9000";

	/**
	 * Name of the key under which the port number ({@link #portNo}) is stored in the {@link #standardLaunchConfigFileName}.
	 */
	protected final static String PORT_KEY = "port";
	
	
	/**
	 * @return {@link #portNo}
	 */
	public String getPortNo() {
		return portNo;
	}

	/**
	 * sets {@link #portNo}
	 * @param portNo
	 */
	public void setPortNo(String portNo) {
		this.portNo = portNo;
	}

	/**
	 * @return the {@link #standardLaunchConfigFileName}
	 */
	public String getStandardLaunchConfigFileName() {
		return standardLaunchConfigFileName;
	}

	/**
	 * sets {@link #standardLaunchConfigFileName}
	 * @param standardLaunchConfigFileName - new value
	 */
	public void setStandardLaunchConfigFileName(String standardLaunchConfigFileName) {
		this.standardLaunchConfigFileName = standardLaunchConfigFileName;
	}

	/**
	 * Constructor for Rhino debug launch management.
	 * @see LaunchManager
	 */
	public RhinoDebugLaunchManager() {
		super();
	}
	
	/**
	 * Reads the configuration settings from the file system using {@link #findLocalStandardLaunchConfiguration()}.
	 * @throws Exception if no configuration file could be found. 
	 */
	public void readDebugLaunchConfiguration() throws Exception {
		//TODO which exception class should be thrown?
		
		// path information code was copied from LaunchManager:findLocalLaunchConfigurations()
		IPath containerPath = RhinoDebugLaunchManager.LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH;
		if (containerPath == null) {
			// no path set
			Exception exc = new Exception("No path found for JavaScript debug launch. " + 
					"LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH in class LaunchManager must be set correctly!");
			//TODO AKR use a builtin launch configuration instead!
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
			Exception exc = new Exception("Standard configuration launch file " + standardLaunchConfigFileName + " for Rhino debugger missing or invalid!\n"
					            + "File was looked for in directory "
								+ containerPath.toOSString());
			throw exc;
		}
		
		//TODO AKR this cast should usually always work. But maybe there should be some meaningful "else" case?
		/*
		 * if stdConfig is LaunchC
		 * then setPort(stdConfig)
		 * else defaultPort();
		 * */
		if (stdConfig instanceof LaunchConfiguration) {
			stdLConfig = (LaunchConfiguration) stdConfig;
			setPortNumFromConfig();

			//just for logging:
			Map<String, Object> attrs = stdLConfig.getAttributes();
			System.out.println("Rhino debug configuration settings:");
			System.out.println(attrs);
		}
		else {
			System.err.println("Something wrong with Rhino debug configuration: wrong type - check this!");
			System.err.println("Trying to connect debugger to port " + getPortNo() + "!");
			System.err.println("Will try to continue execution nevertheless!");
		}
	}		

	
	/**
	 * Starts a new Rhino debug launch using the standard configuration settings given by {@link #stdLConfig}.
	 * @throws Exception if the standard configuration was not properly set before this call.
	 */
	public void startDebugLaunchConfiguration() throws Exception {
		if (stdLConfig == null) {
			// no configuration found
			Exception exc = new Exception("Standard configuration was not correctly initialized!\n");
			throw exc;			
		}
		
		DebugUITools.launch(stdLConfig, ILaunchManager.DEBUG_MODE);

	}

	/**
	 * Checks the given configuration {@link #stdLConfig} for the attribute
	 * {@link #PORT_KEY} and sets {@link #portNo} with its value.
	 */
	private void setPortNumFromConfig() {
		if (stdLConfig == null) {
			System.err.println("Variable stdLConfig for launch configuration is unset in class " + getClass().getCanonicalName() + "!");
			System.err.println("Debug configuration settings cannot be read from it!");
			return;
		}
		
		try {
			Map<String, String> argumentMap = new HashMap<String, String> ();
			Map<String, String> defaultMap = new HashMap<String, String> ();
			defaultMap.put("", "");
			argumentMap = stdLConfig.getAttribute("argument_map", defaultMap);
			if (argumentMap.equals(defaultMap)) {
				System.err.println("No argument map found for Rhino debug configuration settings!");
				System.err.println("Port number could not be extracted!");	
			}			
			else if (argumentMap.containsKey(PORT_KEY)) {
				portNo = argumentMap.get(PORT_KEY);
				System.out.println("Port number is " + portNo + "!");
				//TODO should we test if the port number is in a valid range?
			}	
			else {
				System.err.println("Port number could not be extracted from Rhino debug configuration settings!");
				System.err.println("Key \"" + PORT_KEY + "\" was not found!");
			}
		} catch (CoreException e) {
			// TODO Auto-generated catch block
			System.err.println("No valid argument map found for Rhino debug configuration settings! Port number stays set to default value.");
			e.printStackTrace();
		}
		
		System.out.println("Port number for thread communication between Rhino JavaScript debugger and its launch configuration is set to " + portNo + "!");
	}

	/**
	 * Checks the standard Eclipse debug launch configuration path in order to
	 * find the standard Rhino configuration named
	 * {@link #standardLaunchConfigFileName}
	 * 
	 * @return the found configuration, null if nothing found.
	 */
	protected ILaunchConfiguration findLocalStandardLaunchConfiguration() {
		
		// retrieve launch configurations from disk and check if our standard config exists there
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
}
