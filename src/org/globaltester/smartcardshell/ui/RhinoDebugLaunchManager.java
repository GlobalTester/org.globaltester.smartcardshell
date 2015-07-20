package org.globaltester.smartcardshell.ui;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
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
 * for reading a launch configuration from the file system, creating one, if 
 * no configuration could be found, setting the port
 * number for the socket communication and starting the debugger launch thread.
 * The realization of the thread communication is currently done in
 * {@link org.globaltester.testrunner.ui.commands.DebugTestCommandHandler}. See
 * also {@link org.globaltester.smartcardshell.RhinoJavaScriptAccess} for
 * details on the debugger thread.<br>
 * <br>
 * 
 * Usage: Call {@link #initDebugLaunchConfiguration()} to read the launch
 * configuration from the file system, respectively create a configuration,
 * and to get the port number. Then communicate
 * this port number using
 * {@link RhinoJavaScriptAccess#setStandardPortNum(String)}. The launch can then
 * be started using {@link #startDebugLaunchConfiguration()}. An example for this
 * use and the thread synchronisation needed for these two processes
 * see ->DebugTestCommandHandler (see above).
 * 
 * @author koelzer
 *
 */
public class RhinoDebugLaunchManager extends LaunchManager {
	
	protected final static String prePortNumXMLText = 
	"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n" +
	"<launchConfiguration type=\"org.eclipse.wst.jsdt.debug.core.launchConfigurationType\">\n" +
	"<mapAttribute key=\"argument_map\">\n" +
	"<mapEntry key=\"host\" value=\"localhost\"/>\n" +
	"<mapEntry key=\"port\" value=\"";
		// "9000" +
	protected final static String postPortNumXMLText = 
			"\"/>\n" +
	"</mapAttribute>\n" +
	"<stringAttribute key=\"connector_id\" value=\"rhino.attaching.connector\"/>\n" +
	"<stringAttribute key=\"org.eclipse.debug.core.source_locator_id\" " + 
			"value=\"org.eclipse.wst.jsdt.debug.core.sourceLocator\"/>\n" +
	"<stringAttribute key=\"org.eclipse.debug.core.source_locator_memento\" " +
			"value=\"&lt;?xml version=&quot;1.0&quot; encoding=&quot;UTF-8&quot; " + 
			"standalone=&quot;no&quot;?&gt;&#13;&#10;&lt;sourceLookupDirector&gt;&#13;&#10;&lt;" +
			"sourceContainers duplicates=&quot;true&quot;&gt;&#13;&#10;&lt;" +
			"container memento=&quot;&amp;lt;?xml version=&amp;quot;1.0&amp;quot; " +
			"encoding=&amp;quot;UTF-8&amp;quot; standalone=&amp;quot;no&amp;quot;?&amp;gt;" +
			"&amp;#13;&amp;#10;&amp;lt;folder nest=&amp;quot;false&amp;quot; path=&amp;quot;";
	
			//"/GlobalTester Sample TestSpecification/TestCases" +
	protected final static String postRhinoSourceLookupPathXMLText = 
			"&amp;quot;/&amp;gt;&amp;#13;&amp;#10;&quot; " +
			"typeId=&quot;org.eclipse.debug.core.containerType.folder&quot;" +
			"/&gt;&#13;&#10;&lt;/sourceContainers&gt;&#13;&#10;&lt;" +
			"/sourceLookupDirector&gt;&#13;&#10;\"/>\n" +
	"</launchConfiguration>\n";		
			
	/**
	 * Name for the standard launch configuration file, stored on the file
	 * system under the default Eclipse launch configuraton path. Programmers
	 * can decide to use a different name and change this value (see
	 * {@link #setStandardLaunchConfigFileName(String)}).
	 */
	protected static String standardLaunchConfigFileName = "runJSDebugger";
	
	/**
	 * Attribute name for the key under which the port number ({@link #portNum})
	 * is stored in the file given by {@link #standardLaunchConfigFileName}.
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
	 * launch configuration file given by {@link #standardLaunchConfigFileName}.<br>
	 * Hint: Since it is read as a string from the configuration file, and set
	 * as a string when setting up the socket communication, this is not
	 * declared as an integer.
	 */
	protected String portNum = "9000";

//	/**
//	 * Constructor for Rhino debug launch management which only calls
//	 * the constructor of its super class.
//	 * @see LaunchManager
//	 */
//	public RhinoDebugLaunchManager() {
//		super();
//	}
	
	/**
	 * @return the {@link #standardLaunchConfigFileName}
	 */
	public static String getStandardLaunchConfigFileName() {
		return standardLaunchConfigFileName;
	}

	/**
	 * sets {@link #standardLaunchConfigFileName}
	 * @param newStandardLaunchConfigFileName - new value
	 */
	public static void setStandardLaunchConfigFileName(String newStandardLaunchConfigFileName) {
		standardLaunchConfigFileName = newStandardLaunchConfigFileName;
	}

	/**
	 * Writes a configuration file named {@link #standardLaunchConfigFileName}
	 * plus ".launch" extension to the standard Eclipse debug launch configuration 
	 * path. If the file exists already, it is overwritten.<br>
	 * The method can be used, if no manually created launch file was generated,
	 * which can be checked by calling {@link #readDebugLaunchConfiguration()}.
	 * 
	 * @param sourceLookupRoot root directory where the debugger should start 
	 * 			its source lookup.
	 * @throws FileNotFoundException
	 *             if the file could not be written
	 * @throws RuntimeException
	 *             if anything else went wrong e.g. bad encoding
	 */
	protected void writeLaunchFile(IPath sourceLookupRoot) throws FileNotFoundException, RuntimeException {
		// Hint: a direct access to attributes of launch configurations is not
		// implemented in class LaunchConfiguration; therefore the settings
		// are done by reading them from the file system which is supported.
		// A second advantage of this approach is that the user can manipulate
		// the automatically generated file manually using the standard Eclipse
		// configuration editor. 

		// TODO check if file already exists? OK to overwrite??
		// use a temporary file name?? generate backup??
		
		PrintWriter writer = null;
		String info = "Error when trying to write a launch configuration " + 
				"to the file system.\n";
		String sourceLookupRootString = "";
		if (sourceLookupRoot != null) {
			// set path string for launch configuration 
			sourceLookupRootString = sourceLookupRoot.toString();
		}

		// path information code was copied from LaunchManager:findLocalLaunchConfigurations()
		IPath pathForLaunches = RhinoDebugLaunchManager.LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH;
		if (pathForLaunches == null) {
			// no path set
			FileNotFoundException exc = new FileNotFoundException(info + 
					"No path found for JavaScript debug launch. " + 
					"LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH in class " + 
					"LaunchManager must be set correctly!");
			throw exc;
			
		}

		String fileName = pathForLaunches.toOSString() + File.separator + 
						standardLaunchConfigFileName + "." + 
						LaunchConfiguration.LAUNCH_CONFIGURATION_FILE_EXTENSION;
		
		try {// TODO: should we use UTF-8 here?
			writer = new PrintWriter(fileName, "UTF-8");
			writer.print(prePortNumXMLText + portNum + 
						 postPortNumXMLText + sourceLookupRootString + 
						 postRhinoSourceLookupPathXMLText);
		} catch (UnsupportedEncodingException e) {
			String error = info
					+ "File encoding UTF-8 is not supported by PrintWriter.";
			JSDebugLogger.error(error);
			// we use RuntimeException here to avoid more exception types in the interface
			// and usually there should not be problems with UTF-8
			RuntimeException newExc = new RuntimeException(error, e);
			GtErrorLogger.log(Activator.PLUGIN_ID, newExc);
			throw newExc;
		} finally {
			if (writer != null) {
				writer.flush();
				writer.close();
			}
		}
	}

	/**
	 * Checks the given configuration {@link #launchConfig} for the attribute
	 * {@link #PORT_KEY} and sets {@link #portNum} with its value. If this is not
	 * successful, the value will stay unchanged (it is initially set to a
	 * default value).
	 */
	protected void setPortNumFromConfig() {
		if (launchConfig == null) {
			String error = "Variable launchConfig for launch configuration is unset in class "
					+ getClass().getCanonicalName()
					+ "!\n"
					+ "Debug configuration settings cannot be read from it!\n";
			JSDebugLogger.error(error);
		} else {
			try {
				Map<String, String> argumentMap = new HashMap<String, String>();
				Map<String, String> defaultMap = new HashMap<String, String>();
				defaultMap.put("", "");
				argumentMap = launchConfig.getAttribute("argument_map",
						defaultMap);
				if (argumentMap.equals(defaultMap)) {
					JSDebugLogger
							.error("No argument map found for Rhino debug configuration settings!\n");
					JSDebugLogger
							.error("Port number could not be extracted!\n");
				} else if (argumentMap.containsKey(PORT_KEY)) {
					portNum = argumentMap.get(PORT_KEY);
					JSDebugLogger.info("Port number is " + portNum + "!\n");
				} else {
					JSDebugLogger
							.error("Port number could not be extracted from Rhino debug configuration settings!\n");
					JSDebugLogger.error("Key \"" + PORT_KEY
							+ "\" was not found!\n");
				}
			} catch (CoreException exc) {
				String error = "No valid argument map found for Rhino debug "
						+ "configuration settings! Port number stays set to default value.\n";
				JSDebugLogger.error(error);
				// exc.printStackTrace();
				// we use RuntimeException here to be able to add some log information to it
				RuntimeException newExc = new RuntimeException(error, exc);
				GtErrorLogger.log(Activator.PLUGIN_ID, newExc);
			}
		}

		// If the port number could not be set properly, we try to communicate
		// using the default value.
		String info = "Port number for thread communication between Rhino "
				+ "JavaScript debugger and its launch configuration is set to "
				+ portNum + "!\n";
		JSDebugLogger.info(info);
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
	 * @return {@link #portNum}
	 */
	public String getPortNum() {
		return portNum;
	}

	/**
	 * Reads the configuration settings from the file system using
	 * {@link #findLocalStandardLaunchConfiguration()}.
	 * 
	 * @throws FileNotFoundException if no launch configuration file could be found or opened.
	 * @throws RuntimeException if a type error occurred when accessing the launch configuration.
	 */
	public void readDebugLaunchConfiguration() throws FileNotFoundException, RuntimeException {

		// path information code was copied from LaunchManager:findLocalLaunchConfigurations()
		IPath containerPath = RhinoDebugLaunchManager.LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH;
		if (containerPath == null) {
			// no path set
			FileNotFoundException exc = new FileNotFoundException("No path found for JavaScript debug launch. " + 
					"LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH in class LaunchManager must be set correctly!");
			//NOTE: we could use a builtin launch configuration instead!
			throw exc;			
		}

		final File directory = containerPath.toFile();
		if (directory == null) {
			FileNotFoundException exc = new FileNotFoundException("Error in retrieving file for path " + containerPath.toOSString() + "!");
			throw exc;			
		}

		ILaunchConfiguration stdConfig = findLocalStandardLaunchConfiguration();
		if (stdConfig == null) {
			// no configuration found
			FileNotFoundException exc = new FileNotFoundException("Standard launch configuration file " + 
							standardLaunchConfigFileName + " " +
							"for Rhino debugger missing or invalid!\n" +
							"File was looked for in directory " +
							containerPath.toOSString());
			throw exc;
		}
		
		if (stdConfig instanceof LaunchConfiguration) {
			launchConfig = (LaunchConfiguration) stdConfig;
			setPortNumFromConfig();

			// print logging
			// TODO AKR uncomment this if you want logging of configuration settings! 
			// Map<String, Object> attrs = launchConfig.getAttributes();
			// String info = "Rhino debug configuration settings:" + attrs + "\n";
			// JSDebugLogger.info(info);
		}
		else { // this should only happen if the something basic changes in the 
				// implementation of launches
			String error =  "Something wrong with Rhino debug configuration: wrong type - check this!\n" +
							"Trying to connect debugger to port " + getPortNum() + "!\n" +
							"Will try to continue execution nevertheless!\n";
			JSDebugLogger.error(error);
			throw new ClassCastException(error);
		}
	}		
	
	/**
	 * Tries to read a launch configuration from the file system (see 
	 * {@link #readDebugLaunchConfiguration()}). If this is not successful,
	 * a launch configuration is created and written to the default path for
	 * launches (see {@link #createDebugLaunchConfiguration(IPath)}).
	 * @param sourceLookupRoot root directory where the debugger should start 
	 * 			its source lookup.
	 * @throws FileNotFoundException see {@link #createDebugLaunchConfiguration()}
	 * @throws RuntimeException see {@link #createDebugLaunchConfiguration()}
	 */
	public void initDebugLaunchConfiguration(IPath sourceLookupRoot) throws FileNotFoundException, RuntimeException {
		try {
			readDebugLaunchConfiguration();
		}
		catch (Exception e) {
			// launch configuration could not be read -> create one
			createDebugLaunchConfiguration(sourceLookupRoot);
		}
	}
	
	/**
	 * Creates a debug launch configuration using a default XML debug launch 
	 * configuration file text. This can be used when no launch configuration 
	 * file was created by the user.
	 * For details and exceptions thrown see {@link #writeLaunchFile()}, 
	 * {@link #readDebugLaunchConfiguration()}.
	 * @param sourceLookupRoot root directory where the debugger should start 
	 * 			its source lookup.
	 * @throws FileNotFoundException  
	 * @throws RuntimeException
	 */
	public void createDebugLaunchConfiguration(IPath sourceLookupRoot) throws FileNotFoundException, RuntimeException {
		// write launch file to file system; then read the configuration from there
		writeLaunchFile(sourceLookupRoot);
		readDebugLaunchConfiguration();
	}

	/**
	 * Starts a new Rhino debug launch using the standard configuration settings
	 * given by {@link #launchConfig}.
	 * 
	 * @throws RuntimeException
	 *             if the launch configuration was not properly set before
	 *             this call and therefore no launch can be started.
	 */
	public void startDebugLaunchConfiguration() throws RuntimeException {
		if (launchConfig == null) {
			// no configuration found
			String error = "Standard configuration was not correctly initialized!\n" +
					  "Make sure the launch configuration file " + standardLaunchConfigFileName +
					  " exists on the standard launch configuration path.\n";
			RuntimeException exc = new RuntimeException(error);
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
