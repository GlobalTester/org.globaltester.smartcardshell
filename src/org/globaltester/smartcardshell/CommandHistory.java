package org.globaltester.smartcardshell;

import java.util.ArrayList;

/**
 * This class manages a history of used commands in SCSH.
 * 
 * @author amay
 * 
 */
public class CommandHistory {

	ArrayList<String> commands = new ArrayList<String>();
	int historyPointer = 0;

	public CommandHistory() {
		commands.add("");
	}

	/**
	 * Decrements (if possible) the position in history and returns the found
	 * command.
	 * 
	 * @return previous command in history
	 */
	public String getPreviousCmd() {
		if (historyPointer > 0) {
			historyPointer--;
		}
		return getCurrentCmd();
	}

	/**
	 * Increments (if possible) the position in history and returns the found
	 * command.
	 * 
	 * @return next command in history
	 */
	public String getNextCmd() {
		if (historyPointer < commands.size() - 1) {
			historyPointer++;
		}
		return getCurrentCmd();
	}

	/**
	 * Returns the command at current position in history.
	 * 
	 * @return current command in history
	 */
	public String getCurrentCmd() {
		return commands.get(historyPointer);
	}

	public void setLastCommand(String cmd) {
		commands.set(commands.size() - 1, cmd);
	}

	public String getLastCommand() {
		return commands.get(commands.size() - 1);
	}

	/**
	 * Returns true iff the currentPosition in history points to the last
	 * command
	 * 
	 * @return
	 */
	public boolean isLastCommand() {
		return historyPointer == commands.size() - 1;
	}

	/**
	 * Set the last command to the command provided and append a new empty
	 * command to the history. This makes the command provided as parameter an
	 * unmodifiable part of the history.
	 * 
	 * @param cmd
	 */
	public void append(String cmd) {
		setLastCommand(cmd);
		commands.add("");
		historyPointer = commands.size() - 1;
	}

}
