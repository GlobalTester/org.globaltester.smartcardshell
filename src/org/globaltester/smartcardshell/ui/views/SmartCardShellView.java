package org.globaltester.smartcardshell.ui.views;

import opencard.core.OpenCardException;

import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StyledText;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Event;
import org.eclipse.swt.widgets.Listener;
import org.eclipse.swt.widgets.Text;
import org.eclipse.ui.part.ViewPart;
import org.eclipse.swt.widgets.Control;
import org.globaltester.smartcardshell.GPScriptRunner;

public class SmartCardShellView extends ViewPart {

	public static final String ID = "org.globaltester.smartcardshell.ui.views.SmartCardShellView";
	private StyledText sTxtConsoleOut;
	private Text txtConsoleInput;

	private GPScriptRunner scriptRunner;

	public SmartCardShellView() throws OpenCardException, ClassNotFoundException {
		scriptRunner = new GPScriptRunner();
		scriptRunner.setPromptString("scsh");
		scriptRunner.init();
	}

	public void createPartControl(Composite parent) {

		// use main composite to get rid of outer influence
		Composite mainComp = new Composite(parent, SWT.NONE);
		mainComp.setLayout(new GridLayout(1, false));

		//widget for console output
		sTxtConsoleOut = new StyledText(mainComp, SWT.READ_ONLY | SWT.H_SCROLL
				| SWT.V_SCROLL);
		sTxtConsoleOut
				.setText("Error: ScriptRunner not properly initialized");
		sTxtConsoleOut.setEditable(false);
		sTxtConsoleOut.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true,
				true, 1, 1));

		//widget for command input
		txtConsoleInput = new Text(mainComp, SWT.NONE);
		txtConsoleInput.setLayoutData(new GridData(SWT.FILL, SWT.CENTER, true,
				false, 1, 1));
		mainComp.setTabList(new Control[] { txtConsoleInput });
		txtConsoleInput.addListener(SWT.DefaultSelection, new Listener() {
			public void handleEvent(Event e) {
				String cmd = txtConsoleInput.getText();
				txtConsoleInput.setText("");

				// execute the command and show output
				executeCommand(cmd);

			}
		});
		
		try {
			sTxtConsoleOut
			.setText(scriptRunner.reset());
		} catch (OpenCardException e) {
			sTxtConsoleOut
			.setText("OpenCardException: Could not initalize OpenCardFramework properly. Check the preferences.");
		} catch (ClassNotFoundException e) {
			sTxtConsoleOut
			.setText("ClassNotFoundException: Could not initalize OpenCardFramework properly. Check the preferences.");
		}
	}

	protected void executeCommand(String cmd) {

		// print promt and command in output widget
		sTxtConsoleOut.append("\n" + scriptRunner.getInteractivePrompt()+ "> " + cmd +"\n");
		sTxtConsoleOut.setTopIndex(sTxtConsoleOut.getLineCount());
		
		// execute the command in ScriptRunner and print output to widget
		sTxtConsoleOut.append(scriptRunner.executeCommand(cmd));
		sTxtConsoleOut.setTopIndex(sTxtConsoleOut.getLineCount());

	}

	@Override
	public void setFocus() {
		txtConsoleInput.setFocus();
	}
}
