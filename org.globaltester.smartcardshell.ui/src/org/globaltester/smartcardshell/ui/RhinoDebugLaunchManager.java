package org.globaltester.smartcardshell.ui;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IPath;
import org.eclipse.debug.core.ILaunchConfiguration;
import org.eclipse.debug.core.ILaunchManager;
import org.eclipse.debug.internal.core.LaunchConfiguration;
import org.eclipse.debug.internal.core.LaunchManager;
import org.eclipse.debug.ui.DebugUITools;
import org.globaltester.logging.logger.GtErrorLogger;
import org.globaltester.logging.logger.GTLogger;
import org.globaltester.smartcardshell.Activator;
import org.globaltester.smartcardshell.jsinterface.RhinoJavaScriptAccess;


/**
 * For Rhino JavaScript debugging two threads are needed. One is the debugger
 * thread, one the debugger launch thread. These two threads communicate with
 * one another using a socket. RhinoDebugLaunchManager provides functionality
 * for reading a launch configuration from the file system, creating one, if 
 * no configuration could be found, setting the port
 * number for the socket communication and starting the debugger launch thread.
 * The realization of the thread communication is currently done in
 * {@link org.globaltester.testrunner.ui.commands.DebugTestCommandHandler}. See
 * also {@link org.globaltester.smartcardshell.jsinterface.RhinoJavaScriptAccess} for
 * details on the debugger thread.<br>
 * <br>
 * 
 * Usage: Call {@link #initDebugLaunchConfiguration()} to read the launch
 * configuration from the file system, respectively create a configuration,
 * and to get the port number. Then communicate
 * this port number using
 * {@link RhinoJavaScriptAccess#setStandardPortNum(String)}. The launch can then
 * be started using {@link #startDebugLaunchConfiguration()}. For an example for this
 * use and the thread synchronisation needed for these two processes
 * see ->DebugTestCommandHandler (see above).
 * 
 * @author akoelzer
 *
 */
@SuppressWarnings("restriction")
public class RhinoDebugLaunchManager extends LaunchManager {
	
	/**
	 * path where launch configurations are stored and looked for
	 */
	IPath pathForLaunches = RhinoDebugLaunchManager.LOCAL_LAUNCH_CONFIGURATION_CONTAINER_PATH;

	/**
	 * XML text for the launch configuration file which stands in front of
	 * the port number.
	 */
	protected final static String prePortNumXMLText = 
	"<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>\n" +
	"<launchConfiguration type=\"org.eclipse.wst.jsdt.debug.core.launchConfigurationType\">\n" +
	"<mapAttribute key=\"argument_map\">\n" +
	"<mapEntry key=\"host\" value=\"localhost\"/>\n" +
	"<mapEntry key=\"port\" value=\"";
		// "9000" +

	/**
	 * XML text for the launch configuration file which stands behind
	 * the port number and in front of the source lookup path.
	 */
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
			"&amp;#13;&amp;#10;&amp;lt;directory nest=&amp;quot;false&amp;quot; path=&amp;quot;";
	
			//"/GlobalTester Sample TestSpecification/TestCases" +

	/**
	 * XML text for the launch configuration file which stands behind the
	 * source lookup path.
	 */
	protected final static String postRhinoSourceLookupPathXMLText = 
			"&amp;quot;/&amp;gt;&amp;#13;&amp;#10;&quot; " +
			"typeId=&quot;org.eclipse.debug.core.containerType.directory&quot;" +
			"/&gt;&#13;&#10;&lt;/sourceContainers&gt;&#13;&#10;&lt;" +
			"/sourceLookupDirector&gt;&#13;&#10;\"/>\n" +
	"</launchConfiguration>\n";		
			
	/**
	 * Name for the standard launch configuration file, stored on the file
	 * system under the default Eclipse launch configuraton path. Programmers
	 * can decide to use a different name and change this value (see
	 * {@link #setStandardLaunchConfigFileName(String)}).
	 * If this file exists, the launch configuration settings are taken from it.
	 * If not, a temporary file is used.
	 */
	protected static String standardLaunchConfigFileName = "runJSDebugger";
	
	/**
	 * Name for a temporary launch file which is used when no
	 * standardLaunchConfigFile could be found. This file is deleted after being
	 * read since the user should not edit it.
	 */
	protected static String tmpLaunchConfigFileName = "temp_runJSDebugger";
	
	/**
	 * Attribute name for the key under which the port number ({@link #portNum})
	 * is stored in the file given by {@link #standardLaunchConfigFileName}.
	 */
	protected final static String PORT_KEY = "port";
	
	/**
	 * Path where JavaScript sources for debugging can be looked for by debugger.<br>
	 * NOTE: Currently only one path is supported. The launch configurations may
	 * in principle contain several paths. If one works with test cases to be debugged
	 * which lie in different directories, a common root directory could be used or the
	 * functionality here must be expanded in a way that several paths can be
	 * added. 
	 */
	protected IPath sourceLookupRootPath = null;

	/**
	 * This stores the configuration information read from
	 * {@link #standardLaunchConfigFileName}. Since the configuration may be
	 * changed by the user at runtime, this can be different for different
	 * instances.
	 */
	protected LaunchConfiguration launchConfig = null;

	/**
	 * Port number for the socket communication of the Rhino debugger thread and
	 * its debug launch thread. This value is currently set from the
	 * launch configuration file given by {@link #standardLaunchConfigFileName}.
	 * If it cannot be retrieved from there, a default value is used. Compare 
	 * {@link RhinoJavaScriptAccess#portNum}.<br>
	 */
	protected String portNum = "9000"; /*
										 * NOTE: Since it is read as a string
										 * from the configuration file, and set
										 * as a string when setting up the
										 * socket communication, this is not
										 * declared as an integer.
										 */
	
	/**
	 * extracts relevant debugging settings from envSettings
	 * 
	 * @param envSettings can contain root directory where the debugger should start 
	 * 			its source lookup.
	 */
	public RhinoDebugLaunchManager(HashMap<String, Object> envSettings) {
		// port number is not extracted here, since it is delivered by the launch manager itself
		Object pathObj = envSettings.get(RhinoJavaScriptAccess.RHINO_JS_SOURCE_LOOKUP_HASH_KEY);
		if (pathObj instanceof IPath)
			sourceLookupRootPath = (IPath) pathObj;		
	}

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
	 * Writes a configuration file named configFileName plus ".launch" extension
	 * to the standard Eclipse debug .launches-directory, using the standard
	 * launch file texts combined with the currently set port number and the
	 * source lookup path {@link #sourceLookupRootPath}. If the file exists already, it is
	 * overwritten!<br>
	 * 
	 * @param configFileName
	 *            file name to write to
	 * @throws IOException
	 *             if the file could not be written
	 * @throws RuntimeException
	 *             if anything else went wrong e.g. sourceLookupRootPath is missing or bad encoding
	 */
	protected void writeLaunchConfigFile(String configFileName)
			throws IOException, RuntimeException {
		/*
		 * NOTE: the file is written to the standard Eclipse .launches-directory
		 * since a direct access to attributes of launch configurations is not
		 * implemented in class LaunchConfiguration. Therefore the settings are
		 * written to file and then read from there (which is supported). If one
		 * wants to write the file to a GT internal directory, the path must be
		 * adapted! If one does not want to use the bypass (write launch
		 * configuration to file system) more functionality must be implemented.
		 * 
		 * NOTE: launch configurations are only read once from the file system
		 * by the launch manager and configuration classes when Eclipse is
		 * started. Afterwards adding or changing a launch configuration on the
		 * file system will not be detected!! Thus the changes made and written
		 * to file system by RhinoDebugLaunchManager or newly generated files
		 * will not be noticed in the launch configuration editor and can
		 * therefore not be edited any further by the user!! If editing an
		 * automatically generated or changed launch configuration becomes
		 * necessary, methods for sending notifying signals to the launch
		 * manager must be found resp. implemented.
		 */
		
		PrintWriter writer = null;
		String sourceLookupRootString = "";
		
		String info = "Error when trying to write a launch configuration " + 
				"to the file system.\n";
		if (sourceLookupRootPath != null) {
			// set path string for launch configuration
			sourceLookupRootString = sourceLookupRootPath.toOSString();
			if (sourceLookupRootString == "") { //path missing or not convertable
				throw new RuntimeException(info + 
					"Empty source lookup path set for JavaScript debug launch.");
			}
		} else { //path missing
			throw new RuntimeException(info + 
					"No source lookup path found for JavaScript debug launch.");			
		}

		// path information code was copied from LaunchManager:findLocalLaunchConfigurations()
		if (pathForLaunches == null) {
			// no path set
			IOException exc = new IOException(info + 
					"No path found for JavaScript debug launch. " + 
					"Path for launches in class " + 
					"LaunchManager must be set correctly!");
			throw exc;			
		}

		String fileName = pathForLaunches.toPortableString() + File.separator + 
						configFileName + "." + 
						LaunchConfiguration.LAUNCH_CONFIGURATION_FILE_EXTENSION;
		
		try {
			writer = new PrintWriter(fileName, "UTF-8");
			writer.print(prePortNumXMLText + portNum + 
						 postPortNumXMLText + sourceLookupRootString + 
						 postRhinoSourceLookupPathXMLText);
		} catch (UnsupportedEncodingException e) {
			String error = info + "\nFile name: " + fileName + "\n" +
					"File encoding not supported.\n" +
					"(" + e.getLocalizedMessage() + ")";
			GTLogger.getInstance().error(error);
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
	 * @return {@link #portNum}
	 */
	public String getPortNum() {
		return portNum;
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
			GTLogger.getInstance().error(error);
		} else {
			try {
				Map<String, String> argumentMap = new HashMap<String, String>();
				Map<String, String> defaultMap = new HashMap<String, String>();
				defaultMap.put("", "");
				argumentMap = launchConfig.getAttribute("argument_map",
						defaultMap);
				if (argumentMap.equals(defaultMap)) {
					GTLogger.getInstance()
							.error("No argument map found for Rhino debug configuration settings!\n");
					GTLogger.getInstance()
							.error("Port number could not be extracted!\n");
				} else if (argumentMap.containsKey(PORT_KEY)) {
					portNum = argumentMap.get(PORT_KEY);
					GTLogger.getInstance().info("Port number is " + portNum + "!\n");
				} else {
					GTLogger.getInstance()
							.error("Port number could not be extracted from Rhino debug configuration settings!\n");
					GTLogger.getInstance().error("Key \"" + PORT_KEY
							+ "\" was not found!\n");
				}
			} catch (CoreException exc) { // can come from getAttribute()
				String error = "No valid argument map found for Rhino debug "
						+ "configuration settings! Port number stays set to default value.\n";
				GTLogger.getInstance().error(error);
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
		GTLogger.getInstance().info(info);
	}

	/**
	 * Checks the standard Eclipse debug launch configuration path in order to
	 * find the Rhino configuration named configFileName
	 * 
	 * @param configFileName 
	 * @return the found configuration, null if nothing found.
	 */
	protected ILaunchConfiguration findLocalLaunchConfiguration(String configFileName) {
		
		// retrieve launch configurations from file system and check if our 
		// standard config exists there
		List<ILaunchConfiguration> validConfigs = new ArrayList<ILaunchConfiguration>(20);
		List<ILaunchConfiguration> configs = findLocalLaunchConfigurations();
		verifyConfigurations(configs, validConfigs);

		for (ILaunchConfiguration curConfig:validConfigs) {
			if (curConfig.getName().equals(configFileName)) {
				return curConfig;
			}
		}
		return null;
	}
	
	/**
	 * Reads the configuration settings from the file system using
	 * {@link #findLocalLaunchConfiguration(String)}.
	 * 
	 * @param configFileName name of configuration file which is looked for
	 * 
	 * @throws FileNotFoundException
	 *             if no launch configuration file could be found or opened.
	 * @throws RuntimeException
	 *             if a type error occurred when accessing the launch
	 *             configuration.
	 */
	public void readDebugLaunchConfiguration(String configFileName) throws FileNotFoundException, RuntimeException {

		// path information code was copied from LaunchManager:findLocalLaunchConfigurations()
		if (pathForLaunches == null) {
			// no path set
			FileNotFoundException exc = new FileNotFoundException("No path found for JavaScript debug launch. " + 
					"Path for launches in class LaunchManager must be set correctly!");
			throw exc;			
		}

		ILaunchConfiguration stdConfig = findLocalLaunchConfiguration(configFileName);
		if (stdConfig == null) {
			// no configuration found
			FileNotFoundException exc = new FileNotFoundException("Standard launch configuration file " + 
							configFileName + " " +
							"for Rhino debugger missing or invalid!\n" +
							"File was looked for in directory " +
							pathForLaunches.toPortableString());
			throw exc;
		}
		
		if (stdConfig instanceof LaunchConfiguration) {
			launchConfig = (LaunchConfiguration) stdConfig;
			setPortNumFromConfig();

			// print logging
			// NOTE: uncomment this if you want logging of configuration settings! 
			// Map<String, Object> attrs = launchConfig.getAttributes();
			// String info = "Rhino debug configuration settings:" + attrs + "\n";
			// GTLogger.getInstance().info(info);
		}
		else {	// this should only happen if something basic changes in the 
				// implementation of launches
			String error =  "Something wrong with Rhino debug configuration: wrong type - check this!\n" +
							"Trying to connect debugger to port " + getPortNum() + "!\n" +
							"Will try to continue execution nevertheless!\n";
			GTLogger.getInstance().error(error);
			throw new ClassCastException(error);
		}
	}		
	
	/**
	 * Tries to read the standard launch configuration from the file system (see
	 * {@link #readDebugLaunchConfiguration(String)}). If this is not
	 * successful, a temporary launch configuration is used. In this latter case
	 * the sourceLookupPath must be set properly, since the debugger works with
	 * temporary created copies of the JS files otherwise (which makes editing 
	 * difficult).
	 * 
	 * @throws IOException
	 *             see {@link #createDebugLaunchConfiguration(IPath, String)}
	 * @throws RuntimeException
	 *             see {@link #createDebugLaunchConfiguration(IPath, String)}
	 */
	public void initDebugLaunchConfiguration()
			throws IOException, RuntimeException {
		try {
			readDebugLaunchConfiguration(standardLaunchConfigFileName);
		}
		catch (Exception e) { //must be done in any case; therefore "catch all"
			// launch configuration could not be read -> create a temporary one
			createDebugLaunchConfiguration(tmpLaunchConfigFileName);
			deleteConfigFile(tmpLaunchConfigFileName);
		}
	}
	
	/**
	 * Creates a debug launch configuration using a default XML debug launch 
	 * configuration file text. This can be used when no launch configuration 
	 * file was created by the user.
	 * For details and exceptions thrown see {@link #writeLaunchConfigFile(String)}, 
	 * {@link #readDebugLaunchConfiguration(String)}.
	 * @param configFileName file name to write to 
	 * @throws IOException 
	 * @throws RuntimeException
	 */
	protected void createDebugLaunchConfiguration(String configFileName) throws IOException,
			RuntimeException {
		// write launch file to file system; then read the configuration from there
		writeLaunchConfigFile(configFileName);
		readDebugLaunchConfiguration(configFileName);
	}

	/**
	 * Deletes the launch configuration file configFileName from the Eclipse
	 * .launches-directory. This is currently used for temporary launch configuration files
	 * because they should not stay on the file system and be editable by the
	 * user.
	 * 
	 * @param configFileName
	 * @throws FileNotFoundException
	 */
	protected void deleteConfigFile(String configFileName) throws FileNotFoundException {
		String info = "Error when trying to delete a launch configuration " + 
				"from the file system.\n";

		// path information code was copied from LaunchManager:findLocalLaunchConfigurations()
		if (pathForLaunches == null) {
			// no path set
			FileNotFoundException exc = new FileNotFoundException(info + 
					"No path found for JavaScript debug launch. " + 
					"Path for launches in class " + 
					"LaunchManager must be set correctly!");
			throw exc;			
		}
		String fileName = pathForLaunches.toPortableString() + File.separator + 
				configFileName + "." + 
				LaunchConfiguration.LAUNCH_CONFIGURATION_FILE_EXTENSION;

		File delFile = new File(fileName);
		if (! delFile.delete()) {
			FileNotFoundException exc = new FileNotFoundException(info + 
					"File " + fileName + " could not be deleted!");
			throw exc;						
		}
	}

	/**
	 * Starts a new Rhino debug launch using the configuration settings
	 * given by {@link #launchConfig}.
	 * 
	 * @throws RuntimeException
	 *             if the launch configuration was not properly set before
	 *             this call and therefore no launch can be started.
	 */
	public void startDebugLaunchConfiguration() throws RuntimeException {

		if (launchConfig == null) {
			// no configuration found
			String error = "Standard configuration was not correctly initialized!\n";
			RuntimeException exc = new RuntimeException(error);
			GTLogger.getInstance().error(error);
			throw exc;			
		}
				
		// start launch
		DebugUITools.launch(launchConfig, ILaunchManager.DEBUG_MODE);
	}
}
