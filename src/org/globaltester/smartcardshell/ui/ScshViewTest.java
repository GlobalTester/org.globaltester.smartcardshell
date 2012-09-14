package org.globaltester.smartcardshell.ui;

import org.eclipse.core.runtime.CoreException;
import org.globaltester.smartcardshell.ui.views.SmartCardShellView;
import org.globaltester.swtbot.uihelper.GlobalTesterUiHelper;
import org.globaltester.swtbot.uihelper.ScshViewUiHelper;
import org.junit.Before;
import org.junit.Test;

public class ScshViewTest {
	
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
		view.executeCommand("5+9;");
		String expectedResult = "\nscsh(2)> 5+9;\n"+SmartCardShellView.RETURN_PROMPT+"14";
		view.consoleContainsString(expectedResult);
	}
}
