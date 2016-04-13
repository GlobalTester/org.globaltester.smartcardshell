package org.globaltester.smartcardshell.jsinterface;

import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;

import org.eclipse.core.runtime.IPath;
import org.eclipse.wst.jsdt.debug.rhino.debugger.RhinoDebugger;
import org.globaltester.logging.legacy.logger.GTLogger;
import org.globaltester.logging.legacy.logger.GtErrorLogger;
import org.globaltester.smartcardshell.Activator;
import org.globaltester.smartcardshell.CompoundClassLoader;
import org.globaltester.smartcardshell.ProtocolExtensions;
import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.RhinoException;
import org.mozilla.javascript.tools.shell.Global;

/**
 * This class organizes the access to the Rhino JavaScript evaluator and the
 * Rhino JavaScript debugger. Before it is possible to evaluate JavaScript code,
 * a context must be activated. If debug mode is wished, a debugger must be
 * activated.<br>
 * To use this class construct an instance of it using the default constructor,
 * if no debugging is needed. Otherwise set debugger information by call of 
 * {@link #RhinoJavaScriptAccess(HashMap)}. Then call
 * {@link #activateContext()}. 
 * If a context is no longer needed, finish
 * its use by calling {@link #exitContext()}.
 * 
 * @author akoelzer
 */
public class RhinoJavaScriptAccess {

	public static final String RHINO_JS_PORT_HASH_KEY = "RHINO_JS_PORT_HASH_KEY";
	public static final String RHINO_JS_FILENAME_HASH_KEY = "RHINO_JS_FILENAME_HASH_KEY";
	public static final String RHINO_JS_SOURCE_LOOKUP_HASH_KEY = "RHINO_JS_SOURCE_LOOKUP_HASH_KEY";
	

	/**
	 * This interface class is used for {@link debuggerStartedObj} and serves
	 * as a place holder which can be filled with functionality in later
	 * versions if needed to make some debugger information accessible.
	 */
	interface IDebuggerInfo {
	}

	/**
	 * As long as this object is null, no debugger has been started yet. This is
	 * static because it must be gettable from modules which do not have access
	 * to RhinoJavaSriptAccess objects.
	 */
	static protected IDebuggerInfo debuggerStartedObj = null;

	/**
	 * For JavaScript access a context must be activated. The context factory
	 * delivers a new context respectively the context for the current thread. <br>
	 * NOTE: This context factory is accessible from other modules using
	 * ContextFactory.getGlobal(), see {@link ContextFactory} for details.
	 */
	protected static ContextFactory contextFactory = createContextFactory();
	
	protected static CompoundClassLoader classLoader;

	/**
	 * XML file currently being debugged. Currently only used for testing
	 * the {@link #ConvertFileReader} routines.
	 */
	protected IPath currentXMLFilePath = null;

	/**
	 * If a JavaScript debugger is active, this member stores a reference to it.
	 * Otherwise it is set to null.
	 */
	protected RhinoDebugger debugger = null;

	/**
	 * Indicates if this instance supports JavaScript debugging and a Rhino
	 * debugger is or is going to be connected.
	 */
	protected boolean debugMode = false;

	/**
	 * Port number of this instance for the socket communication
	 * between the debugger thread and the debugger launch thread.
	 * The port number will usually be extracted from the Rhino
	 * debug launch configuration and set then for the RhinoJavaScriptAccess
	 * instance using the constructor or {@link #setPortNum(String)}. 
	 * If nothing is exlicitly set, the default value will be used.
	 * Compare {@link RhinoDebugLaunchManager#portNum}.
	 */
	// NOTE: {@link RhinoDebugLaunchManager#portNum} does not work
	// since module is not imported here
	protected String portNum = "9000";

	/**
	 * constructor usable for activating contexts which do not 
	 * need environment settings
	 */
	public RhinoJavaScriptAccess() {
	}

	/**
	 * constructor extracts relevant debugging settings from envSettings
	 * 
	 * @param envSettings
	 *            may contain environment settings for starting the debugger;
	 *            e.g. port number {@link #portNum} and file path of currently 
	 *            selected resource
	 */
	public RhinoJavaScriptAccess(HashMap<String, Object> envSettings) {
		Object portObj = envSettings.get(RHINO_JS_PORT_HASH_KEY);
		if (portObj instanceof String) {
			portNum = (String) portObj;
			// if a port number is set, debugging shall be activated
			debugMode = true;
		}
		Object pathObj = envSettings.get(RHINO_JS_FILENAME_HASH_KEY);
		if (pathObj instanceof IPath)
			currentXMLFilePath = (IPath) pathObj;
	}		


	/**
	 * Collects the class loaders for all protocol extensions in smartcardshell
	 * and creates a compound class loader from them. This is needed for the
	 * initialization of the {@link #contextFactory}.
	 * 
	 * @return compound class loader
	 */
	protected static CompoundClassLoader getCompoundClassLoaderForProtocols() {
		CompoundClassLoader compLoader = new CompoundClassLoader();
		compLoader.addClass(RhinoJavaScriptAccess.class.getClassLoader()); // class loader for this class
		for (IScshProtocolProvider curProtocolProvider : ProtocolExtensions
				.getInstance().getAllAvailableProtocols()) {
			compLoader
					.addClass(curProtocolProvider.getClass().getClassLoader());
		}
		return compLoader;
	}

	/**
	 * @return {@link #debuggerStartedObj}
	 */
	public static IDebuggerInfo getDebuggerStartedObj() {
		return debuggerStartedObj;
	}

	/**
	 * Creates the {@link #contextFactory} and initializes an appropriate
	 * compound class loader for it, using loaders for protocol extensions,
	 * compare {@link #getCompoundClassLoaderForProtocols()}.<br>
	 * This method is automatically called once when the plugin is loaded
	 * and must not be called elsewhere.
	 */
	protected static ContextFactory createContextFactory() {

		contextFactory = new ContextFactory();

		// here we add an appropriate class loader to avoid the
		// class load problem of org.mozilla.javascript plugin
		
		classLoader = getCompoundClassLoaderForProtocols();
		
		contextFactory
				.initApplicationClassLoader(classLoader);
		return contextFactory;
	}

	/**
	 * 
	 * Makes some necessary settings for the Rhino debugger thread: socket
	 * number, traces on/off, suspend yes/no. Then the debugger is started and
	 * {@link #debuggerStartedObj} is created to inform other modules about
	 * this. Besides this a listener for the debugger is added to the context 
	 * factory.
	 * @throws RuntimeException if the debugger could not be started
	 */
	protected void startJSDebugger() throws RuntimeException {
		try {
			// suspend=y: the debugger should start up in suspended mode, meaning it
			// will not continue execution until a client connects to it
			// trace=y: status should be reported to the Eclipse console
			// simply delete this if you do not want traces
			// String rhino = "transport=socket,suspend=y,trace=y,address=9000";
			String rhino = "transport=socket,suspend=y,address=" + portNum;

			String info = "Trying to start Rhino debugger with settings "
					+ rhino + " ...";
			GTLogger.getInstance().info(info);

			debugger = new RhinoDebugger(rhino);
			// create debuggerStartedObject which is used in debug command
			// handler
			debuggerStartedObj = new IDebuggerInfo() {};

			debugger.start();
			GTLogger.getInstance().info("Debugger thread started!");
					
			if (debugger != null) {
				contextFactory.addListener(debugger);
			}
		} catch (Exception exc) { // probably comes from debugger.start()
			stopJSDebugger();
			String info = ("JavaScript Rhino debugger could not be started!\n") +
							"Reason:\n" + exc.getMessage();
			GTLogger.getInstance().error(info);
//			System.err.println("Rhino Debugger Start Exception:");
//			exc.printStackTrace();

			RuntimeException newExc = new RuntimeException(info, exc);
			GtErrorLogger.log(Activator.PLUGIN_ID, newExc);
			throw newExc;
		}
	}

	/**
	 * If there is an active JavaScript debugger, it is stopped. The appropriate
	 * values are reset.
	 */
	protected void stopJSDebugger() {
		if (debugger == null)
			return;

		try {
			contextFactory.removeListener(debugger);
			debuggerStartedObj = null;
			debugger.stop();
			debugger = null;
		} catch (Exception exc) { // probably coming from debugger.stop()
			String info = "Error while stopping the Rhino JavaScript debugger. Reason:\n " 
					+ exc.getMessage();
			GTLogger.getInstance().error(info);
			//e.printStackTrace();
			GtErrorLogger.log(Activator.PLUGIN_ID, new RuntimeException(info, exc));
			// NOTE: this exception is not send to the UI since
			// there seems currently not to be a need to inform the user
			// explicitly.
		}
	}


	/**
	 * @return {@link #portNum}
	 */
	public String getPortNum() {
		return portNum;
	}

	/**
	 * Sets {@link #portNum}.
	 * 
	 * @param portNum
	 */
	public void setPortNum(String portNum) {
		this.portNum = portNum;
	}


	/**
	 * Delivers a new context - respectively the context connected to the
	 * current thread - and activates it.<br>
	 * activateContext() must always be
	 * followed by {@link #exitContext()} when JavaScript access is finished!
	 * 
	 * @return the activated context
	 */
	public Context activateContext() {
		
		GTLogger.getInstance().info("Activating JavaScript context started with debug mode == " + 
				debugMode +  "\n");

		if (debugMode) {
			startJSDebugger();
		}

		// this always delivers the current context (if none is there, it will
		// be generated
		Context cx = contextFactory.enterContext();
		cx.setApplicationClassLoader(classLoader);
		return cx;
	}

	/**
	 * Stops the JavaScript debugger, if in debug mode, and exits the current
	 * context.
	 */
	public void exitContext() {
		if (debugMode) {
			stopJSDebugger();
			debugMode = false;
		}
		Context.exit();
	}

	/**
	 * Sets current XML file path to "path", only if it has the extension
	 * ".xml", "*.gt" or "*.gtsuite" Otherwise currentXMLFile is set to null.
	 * Currently only used for testing the {@link #ConvertFileReader} routines.
	 * 
	 * @param path
	 */
	public void setCurrentXMLFile(IPath path) {

		currentXMLFilePath = null;

		if (path == null)
			return;

		String ext = path.getFileExtension();
		if ((ext != null) && (ext.equals("xml") || (ext.equals("gt") || ext.equals("gtsuite")))) {
			currentXMLFilePath = path;
		}
	}

	/**
	 * Evaluates an XML test case given by {@link #currentXMLFilePath} calling
	 * the Rhino evaluateReader method with an overridden reader of type
	 * {@link #ConvertFileReader}. Thus only the JavaScript parts of the file
	 * are sent to the evaluator, the pure XML code is ignored.<br>
	 * If any errors occur during evaluation, line number etc. are printed to
	 * system error.<br>
	 * NOTE: Currently only used for testing the {@link #ConvertFileReader}
	 * routines. For activating this testwise open the classes
	 * RunTestCommandHandler and DebugTestCommandHandler. Look for comments
	 * containing "XML converter" and follow the instructions for uncommenting
	 * code there!
	 * 
	 * @throws RuntimeException
	 *             if {@link #currentXMLFilePath} is not set.
	 */
	public void XML2JSConverter() throws RuntimeException {

		if (currentXMLFilePath == null) {
			throw new RuntimeException("File missing conversion of XML file to JavaScript.");
		}

		Context context = Context.enter();
		// Class Global provides for sharing functions across multiple threads.
		// This allows direct access to some standard JS functions.
		Global global = new Global(context);

		try {
			FileReader fileReader = new ConvertFileReader(
					currentXMLFilePath.toPortableString());

			context.evaluateReader(global, fileReader, 
					currentXMLFilePath.toPortableString(), 1, null);
		} catch (RhinoException e) {
//			e.printStackTrace();
			String errorText = "An error occurred reading and evaluating file " + 
								currentXMLFilePath.toPortableString();
			
			System.err.println(errorText);
			System.err.println("Error: " + e.getMessage());
			System.err.println("File: " + e.sourceName());
			System.err.println("Line: " + e.lineSource());
			System.err.println("Line number: " + e.lineNumber());
			System.err.println("Column number: " + e.columnNumber());
			if (e.getCause() != null)
				System.err.println(e.getCause().toString());
		} catch (IOException e) { //includes FileNotFoundException
//			e.printStackTrace();
			String errorText = "An error occurred reading and evaluating file "
					+ currentXMLFilePath;

			System.err.println(errorText);
			System.err.println("Error: " + e.getMessage());
			if (e.getCause() != null)
				System.err.println(e.getCause().toString());
		}

		finally {
			// Exit from the context.
			Context.exit();
		}

	}
	
	/**
	 * Converts the currently active XML file to JavaScript code and writes
	 * the result to a file named the same plus extension ".js" (same location)
	 * <br>
	 * NOTE: Currently only used for testing the {@link #ConvertFileReader}
	 * routines. For activating this testwise open the classes
	 * RunTestCommandHandler and DebugTestCommandHandler. Look for comments
	 * containing "XML converter" and follow the instructions for uncommenting
	 * code there!
	 */
	public void XML2JSWriteToFile() {
		String fileName = currentXMLFilePath.toPortableString();
		try {
			ConvertFileReader reader = new ConvertFileReader(fileName);
			String convertedCode = reader.convertToString();
			reader.close();
			JSFileWriter writer = new JSFileWriter(fileName);
			writer.writeOutput(convertedCode);
		} catch (Exception e) { // there could be different exceptions, which could
					// be handled differently here
			GTLogger.getInstance().error("Error while accessing file " + 
						fileName + " for converting from XML to JavaScript!\n" + 
						"Reason: " + e.getLocalizedMessage());
			e.printStackTrace();
		}
	}

	public static CompoundClassLoader getClassLoader() {
		return classLoader;
	}
}
