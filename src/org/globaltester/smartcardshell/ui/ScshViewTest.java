package org.globaltester.smartcardshell.ui;

import org.eclipse.core.runtime.CoreException;
import org.globaltester.smartcardshell.ui.views.SmartCardShellView;
import org.globaltester.swtbot.uihelper.GlobalTesterUiHelper;
import org.globaltester.swtbot.uihelper.ScshViewUiHelper;
import org.junit.Before;
import org.junit.Test;

public class ScshViewTest {
	String expectedResult = SmartCardShellView.RETURN_PROMPT+"14";
	String command = "5+9;";
	@Before
	public void runBefore() throws CoreException {
		GlobalTesterUiHelper.init();
	}

	/**
	 * Test execution of a simple command using the command input text field
	 * @throws InterruptedException 
	 * 
	 * @throws Exception
	 */
	@Test
	public void testExecuteCommand() {
		ScshViewUiHelper view = GlobalTesterUiHelper.focusScshView();
		view.executeCommand(command);
		view.consoleContainsString("\nscsh(2)> " + command + "\n" + expectedResult);
	}
}
