package org.globaltester.smartcardshell.ui;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;

import org.eclipse.swtbot.eclipse.finder.SWTWorkbenchBot;
import org.eclipse.swtbot.swt.finder.utils.SWTBotPreferences;
import org.eclipse.swtbot.swt.finder.widgets.SWTBotStyledText;
import org.eclipse.swtbot.swt.finder.widgets.SWTBotText;
import org.globaltester.smartcardshell.ScriptRunner;
import org.junit.BeforeClass;
import org.junit.Test;

public class ScshViewTest {

	private SWTWorkbenchBot bot = new SWTWorkbenchBot();

	@BeforeClass
	public static void setUp() {
		SWTBotPreferences.KEYBOARD_LAYOUT = "EN_US";
	}

	/**
	 * Test execution of a simple command using the command input text field
	 * 
	 * @throws Exception
	 */
	@Test
	public void testExecuteCommand() throws Exception {
		String scshBanner = ScriptRunner.getBanner();
		SWTBotStyledText scshOut = bot.styledText(scshBanner);
		SWTBotText scshCommand = bot.textWithLabel("scsh>");
		assertNotNull(scshOut);
		assertNotNull(scshCommand);

		scshCommand.setFocus();
		scshCommand.setText("5+9;");
		scshCommand.typeText("\n");
		assertEquals(scshBanner + "\nscsh(2)> 5+9;\n14", scshOut.getText());
	}
}