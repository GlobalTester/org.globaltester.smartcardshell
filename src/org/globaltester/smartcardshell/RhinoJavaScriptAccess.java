/**
 * 
 */
package org.globaltester.smartcardshell;

import org.eclipse.wst.jsdt.debug.rhino.debugger.RhinoDebugger;
import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;

/**
 * @author koelzer
 *
 */
public class RhinoJavaScriptAccess {

	/**
	 * If a JavaScript debugger is active, this member stores a reference to it. 
	 * Otherwise it is set to null.
	 */
	static protected RhinoDebugger debugger = null;
	
	/**
	 * Port number for socket communication. This is static because it must be 
	 * settable from modules which do not have access to the debugger object.
	 */
	static protected String standardPortNum = "9000";
	
	/**
	 * @see #standardPortNum
	 * @return the standardPortNum
	 */
	public static String getStandardPortNum() {
		return standardPortNum;
	}

	/**
	 * @see #standardPortNum
	 * @param standardPortNum the standardPortNum to set
	 */
	public static void setStandardPortNum(String standardPortNum) {
		RhinoJavaScriptAccess.standardPortNum = standardPortNum;
	}


	/**
	 * If this object is null no debugger has been started yet. This is static because it must be 
	 * gettable from modules which do not have access to the debugger object.
	 */
	static protected Object debuggerStartedObj = null; //TODO how use this object correctly?

	/**
	 * @return the debuggerStartedObj
	 */
	public static Object getDebuggerStartedObj() {
		return debuggerStartedObj;
	}

// currently not useful:
//	/**
//	 * @param debuggerStartedObj the debuggerStartedObj to set
//	 */
//	public static void setDebuggerStartedObj(Object debuggerStartedObj) {
//		RhinoJavaScriptAccess.debuggerStartedObj = debuggerStartedObj;
//	}


	/**
	 * If a JavaScript context is active, this member stores a reference to its factory. 
	 * Otherwise it is set to null.

	 */
	static protected ContextFactory contextFactory = null;

	/**
	 * Pure constructor (does nothing special)
	 */
	public RhinoJavaScriptAccess() {
		// TODO Auto-generated constructor stub
	}

	/**
	 * @return the contextFactory
	 */
	static public ContextFactory getContextFactory() {
		return contextFactory;
	}

	/**
	 * @param contextFactory
	 *            the contextFactory to set
	 */
	static public void setContextFactory(ContextFactory contextFact) {
		contextFactory = contextFact;
	}

	/**
	 * @return the debugger
	 */
	static public RhinoDebugger getDebugger() {
		return debugger;
	}

	/**
	 * @param debugger
	 *            the debugger to set
	 */
	static public void setDebugger(RhinoDebugger rhDebugger) {
		debugger = rhDebugger;
	}

	/**
	 * Collects the class loaders for all protocol extensions in smartcardshell
	 * and creates a composite class loader from them.
	 * @return composite class loader
	 */
	static protected ClassLoader getCompositeClassLoaderForProtocols() {
		CompoundClassLoader compLoader = new CompoundClassLoader();
		for (IScshProtocolProvider curProtocolProvider : ProtocolExtensions
				.getInstance().getAllAvailableProtocols()) {
			compLoader.add(curProtocolProvider.getClass().getClassLoader());
		}
		return compLoader;

	}

	/**
	 * Generates a new context if necessary or activates an existing one and enters it. If debugMode==true, 
	 * the Rhino JavaScript debugger will be started.
	 * activateContext() must always be followed by {@link #closeContext()} 
	 * when JavaScript access is finished!
	 * @param debugMode indicates if the debugger should be started or not
	 * @return the activated context
	 */
	static public Context activateContext(boolean debugMode) {
		Context cx = null;

		if (contextFactory == null) {
			contextFactory = createContextFactory();
		}

		if (debugMode) {
			startDebugging();
		}

		// this always delivers the current context (if none is there, it will be generated)
		cx = contextFactory.enterContext();
		return cx;
	}

	/**
	 * Stops the JavaScript debugger, if any is active, and exits the current context.
	 */
	static public void closeContext() {
		stopJSDebugger();
		Context.exit();
	}

	/**
	 * Creates a new context factory, if there was none. An appropriate class loader 
	 * for protocol extensions is initialized for this factory in case it was newly 
	 * created, compare {@link #getCompositeClassLoaderForProtocols()}.
	 * @return the {@link #contextFactory}
	 */
	static protected ContextFactory createContextFactory() {

		if (contextFactory == null) {
			contextFactory = new ContextFactory();
			// TODO here we could add an appropriate class loader to avoid the
			// class load problem of org.mozilla.javascript plugin
			// factory.initApplicationClassLoader(getClass().getClassLoader());

			// factory.initApplicationClassLoader(new ClassLoader() {});
			contextFactory
					.initApplicationClassLoader(getCompositeClassLoaderForProtocols());
		}

		return contextFactory;
	}

	static public void startDebugging() {
		try {
//			RhinoDebugLaunchManager launchMan = new RhinoDebugLaunchManager();
//			launchMan.readDebugLaunchConfiguration();
			// TODO use correct port number! startJSDebugger(launchMan.getPortNo());
			startJSDebugger(standardPortNum);

			if (debugger != null) {
				contextFactory.addListener(debugger);
				//launchMan.startDebugLaunchConfiguration();
			}
		} catch (Exception exc) {
			if (debugger != null)
				contextFactory.removeListener(debugger);
			stopJSDebugger();
			System.err
					.println("JavaScript Rhino debugger could not be started!");
			System.err.println("Reason:\n" + exc.getMessage());
			exc.printStackTrace();
		}
	}

	static protected void startJSDebugger(String portNum) {

		System.out.println("Trying to start Rhino debugger ...");

		// suspend=y: the debugger should start up in suspended mode, meaning it
		// will not continue execution until a client connects to it
		// trace=y: status should be reported to the Eclipse console
		// simply delete this if you do not want traces
		// String rhino = "transport=socket,suspend=y,trace=y,address=9000";
		String rhino = "transport=socket,suspend=y,address=" + portNum;
		// suspend must be "no" here, because the debug launch is started
		// programmatically
		// directly behind startJSDebugger(); waiting must be prevented
		// therefore!

		try {
			// TODO write some log message somewhere??
			debugger = new RhinoDebugger(rhino);
			// System.out.println("Please, activate Rhino JS launch now!");
			debuggerStartedObj = new Object(); 
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
	 * If there is an active JavaScript debugger, it is stopped.
	 */
	static protected void stopJSDebugger() {
		if (debugger == null)
			return;

		try {
			debuggerStartedObj = null;
			debugger.stop();
			debugger = null;
		} catch (Exception e) {
			System.err
					.println("Error while stopping the Rhino JavaScript debugger.");
			e.printStackTrace();
		}
	}

}
