package org.globaltester.smartcardshell;

import org.eclipse.wst.jsdt.debug.rhino.debugger.RhinoDebugger;
import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;

/**
 * This class organizes the access to the Rhino JavaScript evaluator and the
 * Rhino JavaScript debugger. Before it is possible to evaluate JavaScript code,
 * a context must be activated. If debug mode is wished, a debugger must be
 * activated. This functionality is provided by this class. <br>
 * To use this class construct an instance of it and then call
 * {@link #activateContext(boolean)}. If a context is no longer needed, finish
 * its use by calling {@link #exitContext()}.
 * 
 * @author koelzer
 */
public class RhinoJavaScriptAccess {

	/**
	 * Port number for socket communication between the debugger thread and the
	 * debugger launch thread. This class variable is settable from
	 * modules which do not have access to the RhinoJavaScriptAccess and
	 * debugger objects. It is used for initializing the {@link #portNum} value
	 * in new RhinoJavaScriptAccess instances.
	 */
	static protected String standardPortNum = "9000";

	/**
	 * This interface class is used for {@link #debuggerStartedObj} and serves
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
	 * ContextFactory.getGlobal(), see {@link #ContextFactory} for details.
	 */
	protected static ContextFactory contextFactory = createContextFactory();

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
	 * Individual port number of this instance for the socket communication
	 * between the debugger thread and the debugger launch thread. It can be
	 * used when one wants to work with several debuggers on different ports.<br>
	 * NOTE: This functionality (working with several debuggers) is prepared
	 * for later versions, but not yet implemented. 
	 */
	protected String portNum = "9000";

	/**
	 * Constructor initializes {@link #portNum} with the value of
	 * {@link #standardPortNum}.
	 */
	public RhinoJavaScriptAccess() {
		portNum = standardPortNum;
	}

	/**
	 * Collects the class loaders for all protocol extensions in smartcardshell
	 * and creates a compound class loader from them. This is needed for the
	 * initialization of the {@link #contextFactory}.
	 * 
	 * @return compound class loader
	 */
	protected static ClassLoader getCompoundClassLoaderForProtocols() {
		CompoundClassLoader compLoader = new CompoundClassLoader();
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
	 * @return {@link #standardPortNum}
	 */
	public static String getStandardPortNum() {
		return standardPortNum;
	}

	/**
	 * @see #standardPortNum
	 * @param standardPortNum
	 *            the standardPortNum to set
	 */
	public static void setStandardPortNum(String standardPortNum) {
		RhinoJavaScriptAccess.standardPortNum = standardPortNum;
	}

	/**
	 * Creates the {@link #contextFactory} and initializes an appropriate
	 * compound class loader for it, using loaders for protocol extensions,
	 * compare {@link #getCompoundClassLoaderForProtocols()}.<br>
	 * This method is automatically called on system start and must not be
	 * called elsewhere.
	 */
	protected static ContextFactory createContextFactory() {

		contextFactory = new ContextFactory();
		ContextFactory.initGlobal(contextFactory); // makes this context factory
													// accessible
		// from other modules using ContextFactory.getGlobal()

		// here we add an appropriate class loader to avoid the
		// class load problem of org.mozilla.javascript plugin
		contextFactory
				.initApplicationClassLoader(getCompoundClassLoaderForProtocols());
		return contextFactory;
	}

	/**
	 * Makes some necessary settings for the Rhino debugger thread: socket
	 * number, traces on/off, suspend yes/no. Then the debugger is started and
	 * {@link #debuggerStartedObj} is created to inform other modules about
	 * this.
	 * 
	 * @param curPortNum
	 *            port number for socket to be used by the debugger thread
	 */
	protected void startJSDebugger(String curPortNum) {

		System.out.println("Trying to start Rhino debugger ...");

		// suspend=y: the debugger should start up in suspended mode, meaning it
		// will not continue execution until a client connects to it
		// trace=y: status should be reported to the Eclipse console
		// simply delete this if you do not want traces
		// String rhino = "transport=socket,suspend=y,trace=y,address=9000";
		String rhino = "transport=socket,suspend=y,address=" + curPortNum;

		try {
			// TODO write some log message somewhere??
			debugger = new RhinoDebugger(rhino);
			// create debuggerStartedObject which is used in debug command
			// handler
			debuggerStartedObj = new IDebuggerInfo() {
			};
			debugger.start();
			System.out.println("Debugger started!");
		} catch (Exception e) {
			// TODO print where??
			System.err
					.println("Error while starting the Rhino JavaScript debugger.");
			e.printStackTrace();
			debugger = null;
		}
	}

	/**
	 * Starts the debugger thread (see {@link #startJSDebugger(String)}) and
	 * adds a listener for the debugger to the context factory.
	 */
	protected void startDebugging() {
		try {
			startJSDebugger(portNum);

			if (debugger != null) {
				contextFactory.addListener(debugger);
			}
		} catch (Exception exc) {
			stopJSDebugger();
			System.err // TODO send this info to the calling modules
					.println("JavaScript Rhino debugger could not be started!");
			System.err.println("Reason:\n" + exc.getMessage());
			exc.printStackTrace();
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
		} catch (Exception e) {
			System.err
					.println("Error while stopping the Rhino JavaScript debugger.");
			e.printStackTrace();
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
	 * current thread - and activates it. If debugMode==true, the Rhino
	 * JavaScript debugger will be started. activateContext() must always be
	 * followed by {@link #exitContext()} when JavaScript access is finished!
	 * 
	 * @param newDebugMode
	 *            indicates if the debugger should be started or not
	 * @return the activated context
	 */
	public Context activateContext(boolean newDebugMode) {
		Context cx = null;

		if (newDebugMode) {
			debugMode = true;
			startDebugging();
		}

		// this always delivers the current context (if none is there, it will
		// be generated)
		cx = contextFactory.enterContext();
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
}
