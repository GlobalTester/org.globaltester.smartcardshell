package org.globaltester.smartcardshell.jsinterface;

import java.util.HashMap;

import org.globaltester.logging.legacy.logger.GTLogger;
import org.globaltester.smartcardshell.CompoundClassLoader;
import org.globaltester.smartcardshell.ProtocolExtensions;
import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextFactory;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import org.mozilla.javascript.tools.debugger.Dim;
import org.mozilla.javascript.tools.debugger.ScopeProvider;
import org.mozilla.javascript.tools.debugger.SwingGui;

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

	
	/**
	 * For JavaScript access a context must be activated. The context factory
	 * delivers a new context respectively the context for the current thread. <br>
	 * NOTE: This context factory is accessible from other modules using
	 * ContextFactory.getGlobal(), see {@link ContextFactory} for details.
	 */
	protected static ContextFactory contextFactory = createContextFactory();
	
	protected static CompoundClassLoader classLoader;

	/**
	 * Indicates if this instance supports JavaScript debugging and a Rhino
	 * debugger is or is going to be connected.
	 */
	public static boolean debugMode = false;

	private Dim dim;

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
	 * Delivers a new context - respectively the context connected to the
	 * current thread - and activates it.<br>
	 * activateContext() must always be
	 * followed by {@link #exitContext()} when JavaScript access is finished!
	 * @param scope 
	 * 
	 * @return the activated context
	 */
	public Context activateContext(ScriptableObject scope) {
		
		GTLogger.getInstance().info("Activating JavaScript context started with debug mode == " + 
				debugMode +  "\n");

		if (debugMode) {			
			dim= new Dim();
			dim.attachTo(contextFactory);
			SwingGui gui = new SwingGui(dim, "GT JavaScript debugger");
			gui.setVisible(true);
		}
		
		// this always delivers the current context (if none is there, it will
		// be generated
		Context cx = contextFactory.enterContext();

		if (debugMode) {
			dim.setScopeProvider(new ScopeProvider() {
				
				@Override
				public Scriptable getScope() {
					return scope;
				}
			});
		}
		
		cx.setApplicationClassLoader(classLoader);
		return cx;
	}
	
	public Dim getDim() {
		return dim;
	}

	/**
	 * Stops the JavaScript debugger, if in debug mode, and exits the current
	 * context.
	 */
	public void exitContext() {
		if (debugMode) {
			debugMode = false;
		}
		Context.exit();
	}
	
	public static CompoundClassLoader getClassLoader() {
		return classLoader;
	}
}
