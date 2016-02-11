package org.globaltester.smartcardshell.protocols;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.eclipse.core.runtime.CoreException;
import org.eclipse.core.runtime.IConfigurationElement;
import org.globaltester.smartcardshell.protocols.IScshProtocolProvider;

public abstract class AbstractScshProtocolProvider implements IScshProtocolProvider {

	private ArrayList<ScshCommand> commands;
	private String name;

	@Override
	public void setInitializationData(IConfigurationElement config,
			String propertyName, Object data) throws CoreException {
		// intentionally left empty
		// method required by IExecutableExtension but not useful here
	}

	@Override
	public Collection<String> getCommands() {
		if (commands == null) {
			commands = new ArrayList<ScshCommand>();
			addCommands(commands);
		}
		ArrayList<String> commandNames = new ArrayList<String>();
		for (ScshCommand curCommand : commands) {
			commandNames.add(curCommand.getCommandName());
		}
		
		return commandNames;
	}

	/**
	 * Callback method to create the commands handled by this ProtocolProvider.
	 * 
	 * All supported commands should be created and added to the passed List.
	 * The List itself will be handled by the abstract implementation.
	 * 
	 * @param commandList
	 */
	public abstract void addCommands(List<ScshCommand> commandList);

	@Override
	public List<String> getParams(String command) {
		if (command == null) {
			return null;
		}
		for (ScshCommand curCommand : commands) {
			if (command.equals(curCommand.getCommandName())){
				return curCommand.getParams();
			}
		}
		//command could not be found
		return null;
	}

	@Override
	public String getImplementation(String command) {
		if (command == null) {
			return null;
		}
		for (ScshCommand curCommand : commands) {
			if (command.equals(curCommand.getCommandName())){
				return curCommand.getImplementation();
			}
		}
		//command could not be found
		return null;
	}

	@Override
	public String getHelp(String command) {
		if (command == null) {
			return null;
		}
		for (ScshCommand curCommand : commands) {
			if (command.equals(curCommand.getCommandName())){
				return curCommand.getHelp();
			}
		}
		//command could not be found
		return null;
	}

	@Override
	public String getHelpReturn(String command) {
		if (command == null) {
			return null;
		}
		for (ScshCommand curCommand : commands) {
			if (command.equals(curCommand.getCommandName())){
				return curCommand.getHelpReturn();
			}
		}
		//command could not be found
		return null;
	}

	@Override
	public String getHelpParam(String command, String parameter) {
		if (command == null) {
			return null;
		}
		for (ScshCommand curCommand : commands) {
			if (command.equals(curCommand.getCommandName())){
				return curCommand.getHelpParam(parameter);
			}
		}
		//command could not be found
		return null;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public void setName(String newName) {
		name = newName;
	}

}
