package org.globaltester.smartcardshell.protocols;

import java.util.ArrayList;
import java.util.List;

public class ScshCommand {
	
	private String commandName;
	private ArrayList<ScshCommandParameter> params = new ArrayList<ScshCommandParameter>();
	private String implementation;
	private String help;
	private String helpReturn;
	
	public ScshCommand(String name) {
		setCommandName(name);
	}
	
	public void addParam(ScshCommandParameter newParam){
		params.add(newParam);
	}
	
	public String getCommandName() {
		return commandName;
	}

	
	/**
	 * @see IScshProtocolProvider.getHelp()
	 */
	public String getHelp() {
		return help;
	}

	/**
	 * @see IScshProtocolProvider.getHelpParam()
	 */
	public String getHelpParam(String parameter) {
		if (parameter == null) {
			return null;
		}
		for (ScshCommandParameter curParam : params) {
			if (parameter.equals(curParam.getParamName())){
				return curParam.getHelp();
			}
		}
		//parameter could not be found
		return null;
	}
	
	/**
	 * @see IScshProtocolProvider.getHelpReturn()
	 */
	public String getHelpReturn() {
		return helpReturn;
	}

	/**
	 * @see IScshProtocolProvider.getImplementation()
	 */
	public String getImplementation() {
		return implementation;
	}
	
	/**
	 * @see IScshProtocolProvider.getParams()
	 */
	public List<String> getParams() {
		ArrayList<String> paramNames = new ArrayList<String>();
		for (ScshCommandParameter curParam : params) {
			paramNames.add(curParam.getParamName());
		}
		
		return paramNames;
	}

	public void setCommandName(String name) {
		commandName = name;
	}

	public void setHelp(String help) {
		this.help = help;
	}

	public void setHelpReturn(String helpReturn) {
		this.helpReturn = helpReturn;
	}

	public void setImplementation(String jsCode) {
		implementation = jsCode;
	}

}
