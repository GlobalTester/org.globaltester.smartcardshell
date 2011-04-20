package org.globaltester.smartcardshell.ui.views;

import opencard.core.OpenCardException;

import org.eclipse.swt.SWT;
import org.eclipse.swt.custom.StyledText;
import org.eclipse.swt.layout.GridData;
import org.eclipse.swt.layout.GridLayout;
import org.eclipse.swt.widgets.Composite;
import org.eclipse.swt.widgets.Control;
import org.eclipse.swt.widgets.Event;
import org.eclipse.swt.widgets.Label;
import org.eclipse.swt.widgets.Listener;
import org.eclipse.swt.widgets.Text;
import org.eclipse.ui.part.ViewPart;
import org.globaltester.smartcardshell.ScriptRunner;

public class SmartCardShellView extends ViewPart {

	public static final String ID = "org.globaltester.smartcardshell.ui.views.SmartCardShellView";
	private StyledText sTxtConsoleOut;
	private Text txtConsoleInput;

	private ScriptRunner scriptRunner;
	private Label lblPrompt;

	public SmartCardShellView() throws OpenCardException,
			ClassNotFoundException {
		scriptRunner = new ScriptRunner();
		scriptRunner.setPromptString("scsh");
		scriptRunner.init();
	}

	public void createPartControl(Composite parent) {

		// use main composite to get rid of outer influence
		Composite mainComp = new Composite(parent, SWT.NONE);
		mainComp.setLayout(new GridLayout(2, false));

		// widget for console output
		sTxtConsoleOut = new StyledText(mainComp, SWT.READ_ONLY | SWT.H_SCROLL
				| SWT.V_SCROLL);
		sTxtConsoleOut.setText(scriptRunner.reset());
		sTxtConsoleOut.setEditable(false);
		sTxtConsoleOut.setLayoutData(new GridData(SWT.FILL, SWT.FILL, true,
				true, 2, 1));
		
		lblPrompt = new Label(mainComp, SWT.NONE);
		lblPrompt.setBackground(sTxtConsoleOut.getBackground());
		lblPrompt.setText(scriptRunner.getPromptString()+">");

		// widget for command input
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
		
		//make common white background
		mainComp.setBackground(sTxtConsoleOut.getBackground());

	}

	protected void executeCommand(String cmd) {

		// print promt and command in output widget
		sTxtConsoleOut.append("\n" + scriptRunner.getInteractivePrompt() + "> "
				+ cmd + "\n");
		sTxtConsoleOut.setTopIndex(sTxtConsoleOut.getLineCount());

		// execute the command in ScriptRunner and print output to widget
		String output;
		try {
			output = scriptRunner.executeCommand(cmd);
		} catch (Exception e) {
			output = e.getMessage();
		}
		sTxtConsoleOut.append(output);
		sTxtConsoleOut.setTopIndex(sTxtConsoleOut.getLineCount());

	}

	@Override
	public void setFocus() {
		txtConsoleInput.setFocus();
	}
}
