package org.globaltester.smartcardshell.protocols;


public class ScshCommandParameter {
	
	private String paramName;
	private String help;
	
	public ScshCommandParameter(String paramName, String help) {
		this.paramName = paramName;
		this.help = help;
	}
	
	public ScshCommandParameter(String paramName) {
		this.paramName = paramName;
	}
	
	public String getParamName() {
		return paramName;
	}

	/**
	 * @see IScshProtocolProvider.getHelpParam()
	 */
	public String getHelp() {
		return help;
	}
	
	public void setHelp(String help){
		this.help = help;
	}

}
