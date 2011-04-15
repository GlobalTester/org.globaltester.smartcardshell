package org.globaltester.smartcardshell;

import java.io.PrintStream;

import opencard.core.OpenCardException;
import opencard.core.service.SmartCard;

import org.eclipse.core.runtime.Platform;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.ImporterTopLevel;
import org.mozilla.javascript.Scriptable;

import de.cardcontact.scdp.js.GPRuntime;
import de.cardcontact.scdp.js.GPTracer;

public class GPScriptRunner extends ImporterTopLevel implements GPRuntime {

	private static final long serialVersionUID = -1490363545404798195L;
	private Scriptable scope;
	private int interactiveLineNo = 0;
	private String promptString = "interactive";


	public String init() throws OpenCardException, ClassNotFoundException {
		assert (SmartCard.isStarted());

		// Initialize ECMAScript environment
		Context cx = Context.enter();
		scope = cx.initStandardObjects();
		Context.exit();
		
		return "GlobalTester SmartCardShell\n"+
		"version "+ Platform.getBundle("org.globaltester.smartcardshell").getVersion();
	}
	
	public String reset() throws OpenCardException, ClassNotFoundException {

		scope = null;
		interactiveLineNo = 0;
		return init();
	}

	/**
	 * Execute a command in the scope of this ScriptRunner. SourceName and line
	 * number will be set dynamically to reflect "number" of interactive
	 * commands
	 * 
	 * @param cmd
	 *            ECMAScript code to be executed
	 * @return
	 */
	public String executeCommand(String cmd) {
		return executeCommand(cmd, getPromptString(), interactiveLineNo ++);
	}

	/**
	 * Execute a command in the scope of this ScriptRunner
	 * 
	 * SourceName and lineNo will be used as reference in error/warning messages
	 * 
	 * @param cmd
	 *            ECMAScript code to be executed
	 * @param sourceName
	 *            name/location of the source file
	 * @param lineNo
	 *            line number in the source file
	 * @return
	 */
	public String executeCommand(String cmd, String sourceName, int lineNo) {
		Context cx = Context.enter();
		Object result = cx.evaluateString(scope, cmd, sourceName, lineNo, null);
		Context.exit();
		String resultString = Context.toString(result);
		return resultString;
	}
	
	public String getPromptString() {
		return promptString ;
	}
	
	public void setPromptString(String newPrompt) {
		promptString = newPrompt;
	}
	
	public String getInteractivePrompt(){
		return promptString+"("+interactiveLineNo+")";
	}

	@Override
	public byte[] getSystemID() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public PrintStream getTracePrintStream() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public GPTracer getTracer() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public String mapFilename(String arg0, int arg1) {
		// TODO Auto-generated method stub
		return null;
	}

}
