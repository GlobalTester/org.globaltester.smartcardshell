package org.globaltester.smartcardshell;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.PrintStream;
import java.lang.reflect.InvocationTargetException;
import java.util.Enumeration;

import opencard.core.service.SmartCard;
import opencard.core.terminal.CardTerminal;
import opencard.core.terminal.CardTerminalRegistry;

import org.eclipse.core.runtime.Platform;
import org.globaltester.logging.logger.TestLogger;
import org.globaltester.smartcardshell.preferences.PreferenceConstants;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.ImporterTopLevel;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;

import de.cardcontact.scdp.engine.VersionInfo;
import de.cardcontact.scdp.js.GPRuntime;
import de.cardcontact.scdp.js.GPTracer;
import de.cardcontact.tlv.ObjectIdentifier;

public class ScriptRunner extends ImporterTopLevel implements GPRuntime {

	private static final long serialVersionUID = -1490363545404798195L;
	private int interactiveLineNo = 0;
	private String promptString = "interactive";
	private File currentWorkingDir;
	private transient GPTracer tracer;

	/**
	 * Load and execute script files
	 * 
	 * @param cx
	 *            Context from runtime
	 * @param thisObj
	 *            Object for which method is called
	 * @param args
	 *            Arguments passed to method call
	 * @param funObj
	 *            Function object associated with this method call
	 */
	public static void load(Context cx, Scriptable thisObj, Object[] args,
			Function funObj) {

		ScriptRunner shell = (ScriptRunner) getTopLevelScope(thisObj);
		for (int i = 0; i < args.length; i++) {
			shell.evaluateFile(cx, Context.toString(args[i]));
		}
	}

	/**
	 * Load a Java Class defining an ECMAScript native object
	 * 
	 * @param cx
	 *            Context from runtime
	 * @param thisObj
	 *            Object for which method is called
	 * @param args
	 *            Arguments passed to method call
	 * @param funObj
	 *            Function object associated with this method call
	 * @throws IllegalAccessException
	 * @throws InstantiationException
	 * @throws InvocationTargetException
	 * @throws ClassNotFoundException
	 */
	@SuppressWarnings("unchecked")
	public static void defineClass(Context cx, Scriptable thisObj,
			Object[] args, Function funObj) throws IllegalAccessException,
			InstantiationException, InvocationTargetException,
			ClassNotFoundException {

		String name = Context.toString(args[0]);
		Class<Scriptable> clazz = (Class<Scriptable>) Class.forName(name);
		ScriptableObject.defineClass(thisObj, clazz);
	}

	/**
	 * Print value
	 * 
	 * @param cx
	 *            Context from runtime
	 * @param thisObj
	 *            Object for which method is called
	 * @param args
	 *            Arguments passed to method call
	 * @param funObj
	 *            Function object associated with this method call
	 */
	public static void print(Context cx, Scriptable thisObj, Object[] args,
			Function funObj) {

		String str = "";

		for (int i = 0; i < args.length; i++) {
			// Convert the arbitrary JavaScript value into a string form.
			str = str.concat(Context.toString(args[i]) + " ");
		}
		
		TestLogger.info(str);

		if (thisObj instanceof GPRuntime) {
			GPTracer tr = ((GPRuntime) thisObj).getTracer();
			if (tr != null) {
				tr.trace(ScriptRunner.class.getName(), GPTracer.LogLevel.INFO,
						str);
			}
		} else {
			System.out.println(str);
		}
		
	}

	/**
	 * Create ScriptRunner
	 * 
	 * @param scriptPath
	 *            path where the scripts could be found
	 */
	public ScriptRunner(Context cx, String scriptPath) {
		super(cx);
		currentWorkingDir = new File(scriptPath);
		init(cx);
	}

	/**
	 * Initialization of this shell. Create required functions, classes,
	 * variables and set the environment.
	 */
	private void init(Context cx) {
		assert (SmartCard.isStarted());

		// Initialize ECMAScript environment
		cx.setWrapFactory(new GTWrapFactory());
		cx.initStandardObjects(this);

		// define functions
		String[] names = { "print", "load", "defineClass" };
		defineFunctionProperties(names, ScriptRunner.class,
				ScriptableObject.DONTENUM);

		// define variables
		setEnvironment(cx);
	}

	/**
	 * Return the Banner including version information
	 */
	public static String getBanner() {
		return "GlobalTester SmartCardShell\n"
				+ "version "
				+ Platform.getBundle("org.globaltester.smartcardshell")
						.getVersion();
	}

	/**
	 * Reset the initialization of this shell
	 * 
	 * @param cx
	 * @return
	 */
	public String reset(Context cx) {
		// reset internal variables
		interactiveLineNo = 0;

		// init the context
		init(cx);

		// return the banner
		return getBanner();
	}

	/**
	 * Execute a command in the scope of this ScriptRunner. SourceName and line
	 * number will be set dynamically to reflect "number" of interactive
	 * commands
	 * 
	 * @param cx
	 *            ECMAScript context to execute command in
	 * @param cmd
	 *            ECMAScript code to be executed
	 * @return
	 */
	public String executeCommand(Context cx, String cmd) {
		return executeCommand(cx, cmd, getPromptString(), interactiveLineNo++);
	}

	/**
	 * Execute a command in the scope of this ScriptRunner
	 * 
	 * SourceName and lineNo will be used as reference in error/warning messages
	 * 
	 * @param cx
	 *            ECMAScript context to execute command in
	 * @param cmd
	 *            ECMAScript code to be executed
	 * @param sourceName
	 *            name/location of the source file
	 * @param lineNo
	 *            line number in the source file
	 * @return
	 */
	public String executeCommand(Context cx, String cmd, String sourceName,
			int lineNo) {
		Object result = cx.evaluateString(this, cmd, sourceName, lineNo, null);
		String resultString = Context.toString(result);
		return resultString;
	}

	public String getPromptString() {
		return promptString;
	}

	public void setPromptString(String newPrompt) {
		promptString = newPrompt;
	}

	public String getInteractivePrompt() {
		return promptString + "(" + interactiveLineNo + ")";
	}

	@Override
	public byte[] getSystemID() {
		String str = VersionInfo.SYSTEMIDBASE + ".0." + VersionInfo.MAJOR + "."
				+ VersionInfo.MINOR + "." + VersionInfo.BUILD + ".0";
		ObjectIdentifier oid = new ObjectIdentifier(str);
		return oid.getValue();

	}

	@Override
	public PrintStream getTracePrintStream() {
		// PrintStream of the tracer is not maintained within the ScriptRunner
		// use getTracer() and associated methods instead
		return null;
	}

	@Override
	public GPTracer getTracer() {
		return tracer;
	}

	public void setTracer(GPTracer tr) {
		tracer = tr;
	}

	@Override
	public String mapFilename(String filename, int location) {

		File file = new File(filename);

		if (file.isAbsolute()) {
			return filename;
		}

		String fn = null;

		switch (location) {

		case GPRuntime.CWD:
			file = new File(this.currentWorkingDir, filename);
			fn = file.getAbsolutePath();
			break;

		case GPRuntime.USR:
			file = new File(System.getProperty("user.dir"), filename);
			fn = file.getAbsolutePath();
			break;

		case GPRuntime.SYS:
			file = new File(System.getProperty("user.dir"), filename);
			fn = file.getAbsolutePath();
			break;

		case GPRuntime.AUTO:
			fn = mapFilename(filename, GPRuntime.CWD);
			if (!new File(fn).exists()) {
				fn = mapFilename(filename, GPRuntime.USR);
				if (!new File(fn).exists()) {
					fn = mapFilename(filename, GPRuntime.SYS);
					if (!new File(fn).exists()) {
						fn = null;
					}
				}
			}
			break;

		default:
			fn = null;
		}

		return fn;
	}

	/**
	 * set up the environment of the shell. This includes execution of SCHS
	 * config.js (depending on preferences), setting required variables,
	 * definition of reader name and invocation of extensions to do their setup
	 * 
	 * @param cx
	 *            ECMAScript context to execute commands in
	 * 
	 */
	public void setEnvironment(Context cx) {

		// execute SCSH config.js
		String sCSHconfigFile = Activator.getPluginDir().toPortableString()
				+ Activator.SCSH_FOLDER + File.separator + "config.js";
		if (Platform.getPreferencesService().getBoolean(Activator.PLUGIN_ID,
				PreferenceConstants.JS_CONF_MANUAL, false, null)) {
			sCSHconfigFile = Platform.getPreferencesService().getString(
					Activator.PLUGIN_ID, PreferenceConstants.JS_CONF_FILE,
					sCSHconfigFile, null);
		}
		File f = new File(sCSHconfigFile);
		evaluateFile(cx, f.getAbsolutePath());

		// //readerBuffer
		// int readerBuffer = store
		// .getInt(org.globaltester.preferences.PreferenceConstants.P_READBUFFER);
		// String cmdBuffer = "_readBuffer = \"" + readerBuffer + "\";";
		// exec(cmdBuffer);
		//
		// IPreferenceStore storeTM =
		// org.globaltester.testmanager.Activator.getDefault().getPreferenceStore();
		// boolean serverMode =
		// storeTM.getBoolean(org.globaltester.testmanager.preferences.PreferenceConstants.P_SERVERMODE);
		// String cmdServerMode = "_serverMode = " + serverMode + ";";
		// exec(cmdServerMode);
		//
		// boolean serverModeWithDialogs =
		// storeTM.getBoolean(org.globaltester.testmanager.preferences.PreferenceConstants.P_SERVERMODEWITHDIALOGS);
		// String cmdServerModeWithDialogs = "_serverModeWithDialogs = " +
		// serverModeWithDialogs + ";";
		// exec(cmdServerModeWithDialogs);
		//
		//
		// //ReadFileEOF setting
		// String bufferReadFileEOF = store
		// .getString(org.globaltester.preferences.PreferenceConstants.P_BUFFERREADFILEEOF);
		// String cmdBufferRFE = "_bufferReadFileEOF = \"" + bufferReadFileEOF
		// + "\";";
		// exec(cmdBufferRFE);
		//

		//set the _reader and _manualReader variables
		boolean manualReaderSetting = Platform.getPreferencesService()
				.getBoolean(Activator.PLUGIN_ID,
						PreferenceConstants.OCF_MANUAL_READERSELECT, false,
						null);

		String currentReaderName = "";
		if (manualReaderSetting) {
			//get selected reader name from preferences
			String selectedReader = Platform.getPreferencesService().getString(
					Activator.PLUGIN_ID, PreferenceConstants.OCF_READER, "",
					null);

			//make sure that selected reader is available
			CardTerminalRegistry ctr = CardTerminalRegistry.getRegistry();
			Enumeration<?> ctlist = ctr.getCardTerminals();
			while (ctlist.hasMoreElements()) {
				CardTerminal ct = (CardTerminal) ctlist.nextElement();
				currentReaderName = ct.getName();
				if (currentReaderName.equals(selectedReader)) {
					break;
				}
				currentReaderName = "";
			}

		} else {
			currentReaderName = "";
		}

		
		String cmdReader = "_reader = \"" + currentReaderName + "\";";
		executeCommand(cx, cmdReader);

		String cmdManualReader = "_manualReader = " + manualReaderSetting + ";";
		executeCommand(cx, cmdManualReader);

		// boolean allowEmptyReader =
		// storeTM.getBoolean(PreferenceConstants.P_ALLOW_EMPTY_READER);
		// String cmdEmptyReader = "_allowEmptyReader = " + allowEmptyReader +
		// ";";
		// exec(cmdEmptyReader);
		//
		//
		// // change file separator:
		// char c1 = '\\';
		// char c2 = '/';
		//
		// String cmdWorkingDir = "_workingDir = \"" + currentWorkingDir +
		// "\";";
		// cmdWorkingDir = cmdWorkingDir.replace(c1, c2);
		// exec(cmdWorkingDir);
		//
		// // let all dependent plug-ins integrate in start process
		// Iterator<ITestExtender> iter = Activator.testExtenders.iterator();
		// while (iter.hasNext()) {
		// iter.next().extendScriptEnvironment(this);
		// }
		//
		// // store name of log file in parameter list
		// String cmdLogFileName = "_logFileName = \"" +
		// TestLogger.getLogFileName() + "\";";
		// cmdLogFileName = cmdLogFileName.replace(c1, c2);
		// exec(cmdLogFileName);
		//
		//
		// // define method to dump variables:
		// exec("function dump(param) { return param; }");
		// exec("var comment = \"\";");
		//
		// String propertyFile = store
		// .getString(PreferenceConstants.P_PROPERTYFILE);
		// if (!propertyFile.equals("") && propertyFile.length() > 2) {
		// TestLogger.debug("Reading property file " + propertyFile + " ...");
		// BufferedReader br;
		// try {
		// FileReader reader = new FileReader(propertyFile);
		// br = new BufferedReader(reader);
		//
		// String line = br.readLine();
		//
		// while (line != null) {
		// exec(line);
		// line = br.readLine();
		// }
		// br.close();
		// TestLogger.debug("Property file successfully read");
		// } catch (IOException ioEx) {
		// TestLogger.error(ioEx);
		// }
		// }
	}

	/**
	 * Load and evaluate file
	 * 
	 * @param cx
	 *            current context
	 * @param filename
	 *            file to load and execute
	 */
	public void evaluateFile(Context cx, String filename) {

		FileReader in = null;
		GPRuntime gpr = (GPRuntime) ScriptableObject.getTopLevelScope(this);
		String fullfilename = gpr.mapFilename(filename, GPRuntime.AUTO);

		if (fullfilename == null) {
			Context.reportError("File " + filename + " not found");
		}

		File oldCWD = this.currentWorkingDir;
		File scriptfile = new File(fullfilename);
		this.currentWorkingDir = scriptfile.getParentFile();

		try {
			in = new FileReader(scriptfile);
		} catch (Exception e) {
			this.currentWorkingDir = oldCWD;
			Context.reportError(e.toString());
			return;
		}

		try {
			Object result = cx.evaluateReader(this, in,
					scriptfile.getAbsolutePath(), 1, null);

			if (result != Context.getUndefinedValue()) {
				put("lastresult", this, result);
			}
		} catch (IOException e) {
			Context.reportError(e.toString());
		} finally {
			this.currentWorkingDir = oldCWD;
			try {
				in.close();
			} catch (Exception e) {
				Context.reportError(e.toString());
			}
		}
	}

}
